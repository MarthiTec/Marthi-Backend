import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User, UserRole, UserStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { hashPassword } from '../../common/utils/crypto';
import { PublicUser } from './types/public-user.type';

type CreateUserInput = {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
};

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async count() {
    return this.prisma.user.count();
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findActiveByIdOrThrow(id: string) {
    const user = await this.findById(id);

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return user;
  }

  async create(input: CreateUserInput): Promise<User> {
    const email = input.email.toLowerCase();
    const existing = await this.findByEmail(email);

    if (existing) {
      throw new ConflictException('E-mail já cadastrado');
    }

    const saltRounds = Number(this.config.get('BCRYPT_SALT_ROUNDS', 12));

    return this.prisma.user.create({
      data: {
        email,
        name: input.name,
        passwordHash: await hashPassword(input.password, saltRounds),
        role: input.role ?? UserRole.OPERATOR,
        status: UserStatus.ACTIVE,
      },
    });
  }

  async touchLastLogin(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  toPublic(user: User): PublicUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
