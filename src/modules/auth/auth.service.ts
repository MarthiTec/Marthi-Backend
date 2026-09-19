import {
  Injectable,
  NotImplementedException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { OAuth2Client } from 'google-auth-library';
import { comparePassword } from '../../common/utils/crypto';
import { DEMO_STORE_ID } from '../../common/utils/ids';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { AuthSession, AuthUser, JwtPayload } from './types/auth.types';
import { toAuthUser } from '../users/types/public-user.type';

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client | null = null;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID')?.trim();
    if (clientId) {
      this.googleClient = new OAuth2Client(clientId);
    }
  }

  providers() {
    const googleClientId =
      this.config.get<string>('GOOGLE_CLIENT_ID')?.trim() || null;

    return {
      google: Boolean(googleClientId),
      password: true,
      googleClientId,
    };
  }

  async login(dto: LoginDto): Promise<AuthSession> {
    const user = await this.usersService.findByEmail(dto.email);

    if (
      !user?.passwordHash ||
      !(await comparePassword(dto.password, user.passwordHash))
    ) {
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }

    await this.usersService.touchLastLogin(user.id);
    return this.issueSession(user);
  }

  async loginWithGoogle(idToken: string): Promise<AuthSession> {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID')?.trim();
    if (!this.googleClient || !clientId) {
      throw new NotImplementedException(
        'Login com Google não está configurado.',
      );
    }

    const ticket = await this.googleClient.verifyIdToken({
      idToken,
      audience: clientId,
    });
    const payload = ticket.getPayload();

    if (!payload?.sub || !payload.email) {
      throw new UnauthorizedException('Token Google inválido.');
    }

    let user = await this.usersService.findByGoogleSub(payload.sub);
    if (!user) {
      user = await this.usersService.findByEmail(payload.email);
    }

    if (!user) {
      user = await this.usersService.createGoogleUser({
        id: `google:${payload.sub}`,
        storeId: DEMO_STORE_ID,
        email: payload.email,
        name: payload.name ?? payload.email,
        picture: payload.picture ?? null,
        googleSub: payload.sub,
      });
    }

    await this.usersService.touchLastLogin(user.id);
    return this.issueSession(user);
  }

  async me(userId: string): Promise<{ user: AuthUser }> {
    const user = await this.usersService.findByIdOrThrow(userId);
    return { user: toAuthUser(user) };
  }

  private async issueSession(user: User): Promise<AuthSession> {
    const authUser = toAuthUser(user);
    const payload: JwtPayload = {
      sub: user.id,
      email: authUser.email,
      name: authUser.name,
      picture: authUser.picture,
      provider: authUser.provider,
    };

    const token = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow('JWT_SECRET'),
      expiresIn: this.config.get('JWT_EXPIRES_IN', '7d'),
    });

    return { token, user: authUser };
  }
}
