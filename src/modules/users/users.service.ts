import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthProvider, User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByGoogleSub(googleSub: string) {
    return this.prisma.user.findUnique({ where: { googleSub } });
  }

  async findByIdOrThrow(id: string) {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return user;
  }

  touchLastLogin(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  createGoogleUser(input: {
    id: string;
    storeId: string;
    email: string;
    name: string;
    picture: string | null;
    googleSub: string;
  }): Promise<User> {
    return this.prisma.user.create({
      data: {
        id: input.id,
        storeId: input.storeId,
        email: input.email.toLowerCase(),
        name: input.name,
        picture: input.picture,
        provider: AuthProvider.google,
        googleSub: input.googleSub,
      },
    });
  }
}
