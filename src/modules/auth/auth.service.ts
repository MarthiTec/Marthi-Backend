import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User, UserRole, UserStatus } from '@prisma/client';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import {
  comparePassword,
  hashToken,
  parseDurationToMs,
} from '../../common/utils/crypto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './types/jwt-payload.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto, request: Request) {
    const userCount = await this.usersService.count();
    const publicRegisterEnabled =
      this.config.get('ENABLE_PUBLIC_REGISTER', 'true') === 'true';

    if (userCount > 0 && !publicRegisterEnabled) {
      throw new ForbiddenException('Cadastro público está desabilitado');
    }

    const user = await this.usersService.create({
      ...dto,
      role: userCount === 0 ? UserRole.SUPER_ADMIN : UserRole.OPERATOR,
    });

    return this.issueSession(user, request);
  }

  async login(dto: LoginDto, request: Request) {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user || !(await comparePassword(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Usuário inativo ou bloqueado');
    }

    await this.usersService.touchLastLogin(user.id);
    return this.issueSession(user, request);
  }

  async refresh(refreshToken: string, request: Request) {
    const payload = await this.verifyRefreshToken(refreshToken);
    const tokenHash = hashToken(refreshToken);

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    if (
      stored.userId !== payload.sub ||
      stored.user.status !== UserStatus.ACTIVE
    ) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueSession(stored.user, request);
  }

  async logout(refreshToken: string) {
    const tokenHash = hashToken(refreshToken);

    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { revoked: true };
  }

  async me(userId: string) {
    const user = await this.usersService.findActiveByIdOrThrow(userId);
    return this.usersService.toPublic(user);
  }

  private async issueSession(user: User, request: Request) {
    const tokens = await this.createTokens(user);
    await this.persistRefreshToken(user.id, tokens.refreshToken, request);

    return {
      user: this.usersService.toPublic(user),
      tokens,
    };
  }

  private async createTokens(user: User) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN', '15m'),
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async persistRefreshToken(
    userId: string,
    refreshToken: string,
    request: Request,
  ) {
    const expiresIn = this.config.get('JWT_REFRESH_EXPIRES_IN', '7d');

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + parseDurationToMs(expiresIn)),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      },
    });
  }

  private async verifyRefreshToken(refreshToken: string): Promise<JwtPayload> {
    try {
      return await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido');
    }
  }
}
