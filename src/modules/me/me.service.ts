import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { isImageDataUrl } from '../../common/constants/uploads';
import { validation } from '../../common/errors/http';
import { AuthUser } from '../auth/types/auth.types';
import { UpdateOperatorProfileDto } from './dto/profile.dto';

@Injectable()
export class MeService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(user: AuthUser) {
    const row = await this.prisma.operatorProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        displayName: user.name,
        role: 'Operador',
        photo: null,
      },
    });
    return {
      displayName: row.displayName,
      role: row.role,
      photo: row.photo,
    };
  }

  async updateProfile(user: AuthUser, dto: UpdateOperatorProfileDto) {
    if (dto.photo && dto.photo !== null && !isImageDataUrl(dto.photo)) {
      throw validation('Foto precisa ser data URL de imagem ou null.');
    }
    const current = await this.getProfile(user);
    const row = await this.prisma.operatorProfile.update({
      where: { userId: user.id },
      data: {
        displayName: dto.displayName?.trim() || current.displayName,
        role: dto.role?.trim() || current.role,
        photo: dto.photo === undefined ? current.photo : dto.photo,
      },
    });
    return {
      displayName: row.displayName,
      role: row.role,
      photo: row.photo,
    };
  }
}
