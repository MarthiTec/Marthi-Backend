import { Customer } from '@prisma/client';
import { isoRequired } from '../../common/utils/money';

export function toCustomerJson(row: Customer) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    document: row.document,
    email: row.email,
    city: row.city,
    zipCode: row.zipCode,
    street: row.street,
    number: row.number,
    complement: row.complement,
    neighborhood: row.neighborhood,
    state: row.state,
    active: row.active,
    createdAt: isoRequired(row.createdAt),
  };
}
