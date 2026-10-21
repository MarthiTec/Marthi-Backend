import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';
import { AuthUser, JwtPayload } from '../types/auth.types';
import { toAuthUser } from '../../users/types/public-user.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    try {
      const user = await this.usersService.findById(payload.sub);
      if (user) {
        return toAuthUser(user);
      }
    } catch {
      // MarthiDB Express users may have null store_id; Prisma User.storeId is non-null.
    }

    if (!payload?.sub || typeof payload.email !== 'string') {
      throw new UnauthorizedException('Sessão inválida');
    }

    return {
      id: payload.sub,
      storeId:
        typeof (payload as { storeId?: unknown }).storeId === 'string'
          ? (payload as { storeId: string }).storeId
          : '',
      email: payload.email,
      name: payload.name || payload.email,
      picture: payload.picture ?? null,
      provider: payload.provider === 'google' ? 'google' : 'password',
      role: 'admin',
    };
  }
}
