import {
  AuthProvider,
  DocumentType,
  ModuleId,
  PaymentType,
  PlanId,
  PrismaClient,
  ProductStatus,
  TotemMode,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const STORE_ID = 'STR-CELL-PONTO';

type TotemProductSeed = {
  id: string;
  name: string;
  brand: 'apple' | 'xiaomi';
  storages: string[];
  colors: string[];
  cashPrice: number;
  slug: string;
};

const TOTEM_PRODUCTS: TotemProductSeed[] = [
  {
    id: '1',
    name: 'iPhone 16 Pro Max',
    brand: 'apple',
    storages: ['256 GB', '512 GB'],
    colors: ['Desert', 'Preto', 'Branco', 'Natural'],
    cashPrice: 6990,
    slug: 'iphone-16-pro-max',
  },
  {
    id: '2',
    name: 'iPhone 16 Pro',
    brand: 'apple',
    storages: ['128 GB', '256 GB'],
    colors: ['Preto', 'Branco', 'Desert'],
    cashPrice: 6290,
    slug: 'iphone-16-pro',
  },
  {
    id: '3',
    name: 'iPhone 15',
    brand: 'apple',
    storages: ['128 GB', '256 GB'],
    colors: ['Preto', 'Azul', 'Rosa'],
    cashPrice: 4499,
    slug: 'iphone-15',
  },
  {
    id: '4',
    name: 'iPhone 14',
    brand: 'apple',
    storages: ['128 GB', '256 GB'],
    colors: ['Preto', 'Azul', 'Roxo'],
    cashPrice: 3899,
    slug: 'iphone-14',
  },
  {
    id: '5',
    name: 'iPhone 13',
    brand: 'apple',
    storages: ['128 GB', '256 GB'],
    colors: ['Preto', 'Branco', 'Azul'],
    cashPrice: 3400,
    slug: 'iphone-13',
  },
  {
    id: '6',
    name: 'iPhone 12',
    brand: 'apple',
    storages: ['64 GB', '128 GB'],
    colors: ['Preto', 'Branco', 'Azul'],
    cashPrice: 2799,
    slug: 'iphone-12',
  },
  {
    id: '7',
    name: 'iPhone 11',
    brand: 'apple',
    storages: ['64 GB', '128 GB'],
    colors: ['Preto', 'Branco', 'Vermelho'],
    cashPrice: 2299,
    slug: 'iphone-11',
  },
  {
    id: '19',
    name: 'Redmi Note 13 Pro',
    brand: 'xiaomi',
    storages: ['256 GB', '512 GB'],
    colors: ['Preto', 'Verde', 'Roxo'],
    cashPrice: 2199,
    slug: 'redmi-note-13-pro',
  },
];

function slugValue(prefix: string, value: string) {
  return `${prefix}-${value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}`;
}

async function main() {
  const email = (
    process.env.AUTH_DEV_EMAIL ?? 'teste@marthi.com.br'
  ).toLowerCase();
  const password = process.env.AUTH_DEV_PASSWORD ?? '123';
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.store.upsert({
    where: { id: STORE_ID },
    update: {},
    create: {
      id: STORE_ID,
      tradeName: 'Cell Ponto',
      legalName: 'Cell Ponto Comércio de Eletrônicos',
      documentType: DocumentType.cnpj,
      document: '00000000000000',
      email: 'contato@cellponto.local',
      phone: '11999999999',
      zipCode: '01310100',
      street: 'Avenida Paulista',
      number: '1000',
      complement: '',
      district: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
      segment: 'Celulares',
    },
  });

  await prisma.storeEntitlement.upsert({
    where: { storeId: STORE_ID },
    update: {
      plan: PlanId.scale,
      modules: [ModuleId.totem, ModuleId.presales, ModuleId.os, ModuleId.erp],
    },
    create: {
      storeId: STORE_ID,
      plan: PlanId.scale,
      modules: [ModuleId.totem, ModuleId.presales, ModuleId.os, ModuleId.erp],
    },
  });

  await prisma.totemSettings.upsert({
    where: { storeId: STORE_ID },
    update: { mode: TotemMode.kiosk },
    create: { storeId: STORE_ID, mode: TotemMode.kiosk },
  });

  const userId = `password:${email}`;
  await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      provider: AuthProvider.password,
      storeId: STORE_ID,
    },
    create: {
      id: userId,
      storeId: STORE_ID,
      email,
      name: 'Marthi Teste',
      picture: null,
      provider: AuthProvider.password,
      passwordHash,
    },
  });

  await prisma.operatorProfile.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      displayName: 'Marthi Teste',
      role: 'Operador',
    },
  });

  await prisma.brand.upsert({
    where: { slug: 'apple' },
    update: { name: 'Apple' },
    create: { id: 'BRD-APPLE', slug: 'apple', name: 'Apple' },
  });
  await prisma.brand.upsert({
    where: { slug: 'xiaomi' },
    update: { name: 'Xiaomi' },
    create: { id: 'BRD-XIAOMI', slug: 'xiaomi', name: 'Xiaomi' },
  });

  const colorAttr = await prisma.productAttribute.upsert({
    where: { id: 'ATTR-COR' },
    update: {},
    create: {
      id: 'ATTR-COR',
      storeId: STORE_ID,
      name: 'Cor',
      useOnTotem: true,
      filterOnTotem: true,
      useOnStock: true,
      sort: 1,
      active: true,
    },
  });
  const capacityAttr = await prisma.productAttribute.upsert({
    where: { id: 'ATTR-CAP' },
    update: {},
    create: {
      id: 'ATTR-CAP',
      storeId: STORE_ID,
      name: 'Capacidade',
      useOnTotem: true,
      filterOnTotem: true,
      useOnStock: true,
      sort: 2,
      active: true,
    },
  });
  const pickupAttr = await prisma.productAttribute.upsert({
    where: { id: 'ATTR-RET' },
    update: {},
    create: {
      id: 'ATTR-RET',
      storeId: STORE_ID,
      name: 'Retirada',
      useOnTotem: true,
      filterOnTotem: false,
      useOnStock: false,
      sort: 3,
      active: true,
    },
  });

  const colors = [
    'Desert',
    'Preto',
    'Branco',
    'Natural',
    'Azul',
    'Rosa',
    'Roxo',
    'Verde',
    'Vermelho',
  ];
  const storages = ['64 GB', '128 GB', '256 GB', '512 GB'];

  for (const [index, color] of colors.entries()) {
    await prisma.productAttributeValue.upsert({
      where: { id: slugValue('ATTR-COR', color) },
      update: {},
      create: {
        id: slugValue('ATTR-COR', color),
        attributeId: colorAttr.id,
        value: color,
        priceDelta: 0,
        sort: index,
      },
    });
  }

  for (const [index, storage] of storages.entries()) {
    await prisma.productAttributeValue.upsert({
      where: { id: slugValue('ATTR-CAP', storage) },
      update: {},
      create: {
        id: slugValue('ATTR-CAP', storage),
        attributeId: capacityAttr.id,
        value: storage,
        priceDelta: 0,
        sort: index,
      },
    });
  }

  await prisma.productAttributeValue.upsert({
    where: { id: 'ATTR-RET-PRONTA' },
    update: {},
    create: {
      id: 'ATTR-RET-PRONTA',
      attributeId: pickupAttr.id,
      value: 'Pronta entrega',
      priceDelta: 0,
      sort: 0,
    },
  });
  await prisma.productAttributeValue.upsert({
    where: { id: 'ATTR-RET-ENCOMENDA' },
    update: {},
    create: {
      id: 'ATTR-RET-ENCOMENDA',
      attributeId: pickupAttr.id,
      value: 'Por encomenda',
      priceDelta: 250,
      sort: 1,
    },
  });

  const brands = await prisma.brand.findMany();
  const brandBySlug = Object.fromEntries(
    brands.map((brand) => [brand.slug, brand.id]),
  );

  for (const [index, item] of TOTEM_PRODUCTS.entries()) {
    await prisma.product.upsert({
      where: { id: item.id },
      update: {
        name: item.name,
        cashPrice: item.cashPrice,
        brandId: brandBySlug[item.brand],
        status: ProductStatus.active,
        sort: index,
      },
      create: {
        id: item.id,
        storeId: STORE_ID,
        brandId: brandBySlug[item.brand],
        name: item.name,
        status: ProductStatus.active,
        cashPrice: item.cashPrice,
        sort: index,
      },
    });

    await prisma.productImage.deleteMany({ where: { productId: item.id } });
    await prisma.productImage.createMany({
      data: [1, 2].map((sort) => ({
        id: `IMG-${item.id}-${sort}`,
        productId: item.id,
        url: `/totem/${item.slug}/${sort}.svg`,
        sort,
      })),
    });

    const valueIds = [
      ...item.colors.map((color) => slugValue('ATTR-COR', color)),
      ...item.storages.map((storage) => slugValue('ATTR-CAP', storage)),
      'ATTR-RET-PRONTA',
      'ATTR-RET-ENCOMENDA',
    ];

    await prisma.productAllowedValue.deleteMany({
      where: { productId: item.id },
    });
    await prisma.productAllowedValue.createMany({
      data: valueIds.map((valueId) => ({ productId: item.id, valueId })),
    });
  }

  await prisma.priceTable.upsert({
    where: { id: 'TAB-VISTA' },
    update: {},
    create: {
      id: 'TAB-VISTA',
      storeId: STORE_ID,
      name: 'Vista',
      percent: 0,
      active: true,
    },
  });
  await prisma.priceTable.upsert({
    where: { id: 'TAB-ATACADO' },
    update: {},
    create: {
      id: 'TAB-ATACADO',
      storeId: STORE_ID,
      name: 'Atacado',
      percent: -8,
      active: true,
    },
  });
  await prisma.priceTable.upsert({
    where: { id: 'TAB-CARTAO' },
    update: {},
    create: {
      id: 'TAB-CARTAO',
      storeId: STORE_ID,
      name: 'Cartão',
      percent: 5,
      active: true,
    },
  });

  const payments = [
    {
      id: 'PAY-DINHEIRO',
      name: 'Dinheiro',
      type: PaymentType.cash,
      table: 'TAB-VISTA',
      max: 1,
    },
    {
      id: 'PAY-PIX',
      name: 'Pix',
      type: PaymentType.pix,
      table: 'TAB-VISTA',
      max: 1,
    },
    {
      id: 'PAY-DEBITO',
      name: 'Débito',
      type: PaymentType.debit,
      table: 'TAB-VISTA',
      max: 1,
    },
    {
      id: 'PAY-CREDITO',
      name: 'Cartão de crédito',
      type: PaymentType.credit,
      table: 'TAB-CARTAO',
      max: 12,
    },
  ];

  for (const payment of payments) {
    await prisma.paymentMethod.upsert({
      where: { id: payment.id },
      update: {},
      create: {
        id: payment.id,
        storeId: STORE_ID,
        name: payment.name,
        type: payment.type,
        priceTableId: payment.table,
        maxInstallments: payment.max,
        active: true,
      },
    });
  }

  console.log(`Seed concluído. Loja ${STORE_ID}. Login: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
