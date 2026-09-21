import { Injectable } from '@nestjs/common';
import { Customer, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { conflict, notFound } from '../../common/errors/http';
import { prefixedId } from '../../common/utils/ids';
import { digitsOnly, optionalText, upperUf } from '../../common/utils/phone';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';
import { toCustomerJson } from './customers.mapper';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(storeId: string, q?: string) {
    const where: Prisma.CustomerWhereInput = { storeId };
    const needle = q?.trim();
    if (needle) {
      const digits = digitsOnly(needle);
      where.OR = [
        { name: { contains: needle, mode: 'insensitive' } },
        { document: { contains: needle, mode: 'insensitive' } },
        { email: { contains: needle, mode: 'insensitive' } },
        ...(digits ? [{ phoneDigits: { contains: digits } }, { phone: { contains: needle } }] : [{ phone: { contains: needle } }]),
      ];
    }

    const rows = await this.prisma.customer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toCustomerJson);
  }

  async get(storeId: string, id: string) {
    return toCustomerJson(await this.findOwned(storeId, id));
  }

  async create(storeId: string, dto: CreateCustomerDto) {
    const phoneDigits = digitsOnly(dto.phone);
    if (phoneDigits.length < 8) {
      throw conflict('Informe um telefone com pelo menos 8 dígitos.');
    }

    const existing = await this.prisma.customer.findUnique({
      where: { storeId_phoneDigits: { storeId, phoneDigits } },
    });
    if (existing) {
      throw conflict('Já existe cliente com este telefone nesta loja.', {
        id: existing.id,
      });
    }

    const row = await this.prisma.customer.create({
      data: {
        id: prefixedId('CLI'),
        storeId,
        name: dto.name.trim(),
        phone: dto.phone.trim(),
        phoneDigits,
        document: optionalText(dto.document),
        email: optionalText(dto.email).toLowerCase(),
        city: optionalText(dto.city),
        zipCode: optionalText(dto.zipCode),
        street: optionalText(dto.street),
        number: optionalText(dto.number),
        complement: optionalText(dto.complement),
        neighborhood: optionalText(dto.neighborhood),
        state: upperUf(dto.state),
        active: dto.active ?? true,
      },
    });
    return toCustomerJson(row);
  }

  async update(storeId: string, id: string, dto: UpdateCustomerDto) {
    await this.findOwned(storeId, id);
    const data: Prisma.CustomerUpdateInput = {};

    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.document !== undefined) data.document = optionalText(dto.document);
    if (dto.email !== undefined) data.email = optionalText(dto.email).toLowerCase();
    if (dto.city !== undefined) data.city = optionalText(dto.city);
    if (dto.zipCode !== undefined) data.zipCode = optionalText(dto.zipCode);
    if (dto.street !== undefined) data.street = optionalText(dto.street);
    if (dto.number !== undefined) data.number = optionalText(dto.number);
    if (dto.complement !== undefined) data.complement = optionalText(dto.complement);
    if (dto.neighborhood !== undefined) {
      data.neighborhood = optionalText(dto.neighborhood);
    }
    if (dto.state !== undefined) data.state = upperUf(dto.state);
    if (dto.active !== undefined) data.active = dto.active;
    if (dto.phone !== undefined) {
      const phoneDigits = digitsOnly(dto.phone);
      if (phoneDigits.length < 8) {
        throw conflict('Informe um telefone com pelo menos 8 dígitos.');
      }
      const clash = await this.prisma.customer.findUnique({
        where: { storeId_phoneDigits: { storeId, phoneDigits } },
      });
      if (clash && clash.id !== id) {
        throw conflict('Já existe cliente com este telefone nesta loja.', {
          id: clash.id,
        });
      }
      data.phone = dto.phone.trim();
      data.phoneDigits = phoneDigits;
    }

    const row = await this.prisma.customer.update({ where: { id }, data });
    return toCustomerJson(row);
  }

  async remove(storeId: string, id: string) {
    await this.findOwned(storeId, id);
    const row = await this.prisma.customer.update({
      where: { id },
      data: { active: false },
    });
    return toCustomerJson(row);
  }

  async upsertFromPos(
    tx: Prisma.TransactionClient,
    storeId: string,
    input: { name: string; phone: string; document?: string },
  ): Promise<Customer | null> {
    const phoneDigits = digitsOnly(input.phone);
    if (phoneDigits.length < 8) return null;

    const existing = await tx.customer.findUnique({
      where: { storeId_phoneDigits: { storeId, phoneDigits } },
    });
    if (existing) {
      return tx.customer.update({
        where: { id: existing.id },
        data: {
          name: input.name.trim() || existing.name,
          phone: input.phone.trim() || existing.phone,
          document: optionalText(input.document) || existing.document,
          active: true,
        },
      });
    }

    return tx.customer.create({
      data: {
        id: prefixedId('CLI'),
        storeId,
        name: input.name.trim() || 'Cliente PDV',
        phone: input.phone.trim(),
        phoneDigits,
        document: optionalText(input.document),
        email: '',
        city: '',
        zipCode: '',
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        state: '',
        active: true,
      },
    });
  }

  private async findOwned(storeId: string, id: string) {
    const row = await this.prisma.customer.findFirst({ where: { id, storeId } });
    if (!row) throw notFound('Cliente não encontrado.');
    return row;
  }
}
