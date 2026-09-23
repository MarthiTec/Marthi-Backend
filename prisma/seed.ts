import {
  AuthProvider,
  DocumentType,
  EmployeeRole,
  ModuleId,
  PaymentType,
  PlanId,
  PrismaClient,
  ProductStatus,
  StockCondition,
  StockKind,
  TotemMode,
  AccessArea,
  BankAccountType,
  FiscalSefazEnvironment,
  FiscalStorageMode,
  FiscalTaxSyncSource,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

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
      plan: PlanId.golden,
      modules: [
        ModuleId.totem,
        ModuleId.os,
        ModuleId.erp,
        ModuleId.fiscal,
        ModuleId.ecommerce,
      ],
    },
    create: {
      storeId: STORE_ID,
      plan: PlanId.golden,
      modules: [
        ModuleId.totem,
        ModuleId.os,
        ModuleId.erp,
        ModuleId.fiscal,
        ModuleId.ecommerce,
      ],
    },
  });

  await prisma.totemSettings.upsert({
    where: { storeId: STORE_ID },
    update: { mode: TotemMode.kiosk, exitPassword: 'cellponto' },
    create: {
      storeId: STORE_ID,
      mode: TotemMode.kiosk,
      exitPassword: 'cellponto',
      shareStockWithErp: false,
    },
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

  await prisma.customer.upsert({
    where: { id: 'CLI-ANA' },
    update: { name: 'Ana Souza', phone: '11988880001', phoneDigits: '11988880001' },
    create: {
      id: 'CLI-ANA',
      storeId: STORE_ID,
      name: 'Ana Souza',
      phone: '11988880001',
      phoneDigits: '11988880001',
      document: '12345678901',
      email: 'ana@cliente.local',
      city: 'São Paulo',
      zipCode: '01310100',
      street: 'Avenida Paulista',
      number: '1000',
      neighborhood: 'Bela Vista',
      state: 'SP',
      active: true,
    },
  });
  await prisma.customer.upsert({
    where: { id: 'CLI-CARLOS' },
    update: { name: 'Carlos Lima', phone: '11988880002', phoneDigits: '11988880002' },
    create: {
      id: 'CLI-CARLOS',
      storeId: STORE_ID,
      name: 'Carlos Lima',
      phone: '11988880002',
      phoneDigits: '11988880002',
      document: '98765432100',
      email: 'carlos@cliente.local',
      city: 'São Paulo',
      zipCode: '04038001',
      street: 'Rua Domingos de Morais',
      number: '500',
      neighborhood: 'Vila Mariana',
      state: 'SP',
      active: true,
    },
  });

  await prisma.stockItem.upsert({
    where: { id: 'STK-TELA' },
    update: { qty: 5, cost: 280, price: 450 },
    create: {
      id: 'STK-TELA',
      storeId: STORE_ID,
      name: 'Tela iPhone 13',
      sku: 'PEC-TELA-13',
      barcode: '789100000001',
      qty: 5,
      minQty: 1,
      cost: 280,
      price: 450,
      kind: StockKind.part,
      condition: StockCondition.new,
      color: 'Preto',
      capacity: '',
    },
  });
  await prisma.stockItem.upsert({
    where: { id: 'STK-BATERIA' },
    update: { qty: 8, cost: 90, price: 180 },
    create: {
      id: 'STK-BATERIA',
      storeId: STORE_ID,
      name: 'Bateria iPhone 12',
      sku: 'PEC-BAT-12',
      barcode: '789100000002',
      qty: 8,
      minQty: 2,
      cost: 90,
      price: 180,
      kind: StockKind.part,
      condition: StockCondition.new,
    },
  });
  await prisma.stockItem.upsert({
    where: { id: 'STK-DEMO-APARELHO' },
    update: { qty: 2, cost: 1200, price: 1899 },
    create: {
      id: 'STK-DEMO-APARELHO',
      storeId: STORE_ID,
      name: 'iPhone 12 128 GB',
      sku: 'DEV-IP12-128',
      barcode: '789100000003',
      imei: '356938035643809',
      qty: 2,
      minQty: 0,
      cost: 1200,
      price: 1899,
      kind: StockKind.device,
      condition: StockCondition.used,
      color: 'Preto',
      capacity: '128 GB',
      showOnTotem: false,
    },
  });

  const allAreas: AccessArea[] = [
    AccessArea.totem,
    AccessArea.pdv,
    AccessArea.os,
    AccessArea.erp_customers,
    AccessArea.erp_stock,
    AccessArea.erp_attrs,
    AccessArea.erp_prices,
    AccessArea.erp_payments,
    AccessArea.erp_finance,
    AccessArea.erp_sellers,
    AccessArea.erp_suppliers,
    AccessArea.erp_employees,
    AccessArea.erp_audit,
    AccessArea.erp_invoices,
    AccessArea.erp_fiscal,
    AccessArea.ecommerce,
    AccessArea.erp_plan,
  ];

  await prisma.employee.upsert({
    where: { id: 'EMP-ADMIN' },
    update: {
      userEmail: email,
      isSystemUser: true,
      role: EmployeeRole.admin,
      accessAreas: allAreas,
      active: true,
    },
    create: {
      id: 'EMP-ADMIN',
      storeId: STORE_ID,
      name: 'Administrador da loja',
      phone: '',
      email,
      document: '',
      role: EmployeeRole.admin,
      isSystemUser: true,
      userEmail: email,
      accessAreas: allAreas,
      active: true,
    },
  });

  await prisma.employee.upsert({
    where: { id: 'EMP-ANA' },
    update: {
      name: 'Ana Costa',
      role: EmployeeRole.operator,
      accessAreas: [AccessArea.os, AccessArea.erp_stock, AccessArea.erp_customers],
    },
    create: {
      id: 'EMP-ANA',
      storeId: STORE_ID,
      name: 'Ana Costa',
      phone: '(24) 99900-1111',
      email: 'ana@loja.local',
      document: '',
      role: EmployeeRole.operator,
      isSystemUser: false,
      userEmail: '',
      accessAreas: [AccessArea.os, AccessArea.erp_stock, AccessArea.erp_customers],
      active: true,
    },
  });

  await prisma.seller.upsert({
    where: { id: 'VEN-BRUNO' },
    update: { name: 'Bruno Vendas', commissionPercent: 2, active: true },
    create: {
      id: 'VEN-BRUNO',
      storeId: STORE_ID,
      name: 'Bruno Vendas',
      phone: '(24) 98800-2222',
      email: 'bruno@loja.local',
      document: '',
      commissionPercent: 2,
      active: true,
    },
  });

  await prisma.supplier.upsert({
    where: { id: 'FOR-CELSUL' },
    update: { name: 'Distribuidora Celular Sul', tradeName: 'CelSul' },
    create: {
      id: 'FOR-CELSUL',
      storeId: STORE_ID,
      name: 'Distribuidora Celular Sul',
      tradeName: 'CelSul',
      document: '12.345.678/0001-90',
      phone: '(21) 3333-4444',
      email: 'compras@celsul.local',
      city: 'Rio de Janeiro',
      notes: 'Peças e aparelhos',
      active: true,
    },
  });

  await prisma.warehouse.upsert({
    where: { id: 'ALX-01' },
    update: { name: 'Loja', code: 'ALX-01', address: 'Loja · depósito', active: true },
    create: {
      id: 'ALX-01',
      storeId: STORE_ID,
      name: 'Loja',
      code: 'ALX-01',
      address: 'Loja · depósito',
      active: true,
    },
  });

  await prisma.warehouse.upsert({
    where: { id: 'ALX-BANC' },
    update: {
      name: 'Bancada OS',
      code: 'ALX-BANC',
      address: 'Área técnica',
      active: true,
    },
    create: {
      id: 'ALX-BANC',
      storeId: STORE_ID,
      name: 'Bancada OS',
      code: 'ALX-BANC',
      address: 'Área técnica',
      active: true,
    },
  });

  await prisma.bankAccount.upsert({
    where: { id: 'ACC-CAIXA' },
    update: {
      name: 'Caixa loja',
      bank: 'Espécie',
      agency: '—',
      number: 'CAIXA-01',
      type: BankAccountType.cash,
      initialBalance: 800,
      active: true,
    },
    create: {
      id: 'ACC-CAIXA',
      storeId: STORE_ID,
      name: 'Caixa loja',
      bank: 'Espécie',
      agency: '—',
      number: 'CAIXA-01',
      type: BankAccountType.cash,
      initialBalance: 800,
      active: true,
    },
  });

  await prisma.bankAccount.upsert({
    where: { id: 'ACC-OPER' },
    update: {
      name: 'Conta operacional',
      bank: 'Banco Exemplo',
      agency: '0001',
      number: '12345-6',
      type: BankAccountType.checking,
      initialBalance: 12500,
      active: true,
    },
    create: {
      id: 'ACC-OPER',
      storeId: STORE_ID,
      name: 'Conta operacional',
      bank: 'Banco Exemplo',
      agency: '0001',
      number: '12345-6',
      type: BankAccountType.checking,
      initialBalance: 12500,
      active: true,
    },
  });

  await prisma.fiscalIssuerSettings.upsert({
    where: { storeId: STORE_ID },
    update: {},
    create: {
      storeId: STORE_ID,
      municipio: 'Rio de Janeiro',
      uf: 'RJ',
      cMun: '3304557',
      environment: FiscalSefazEnvironment.homologacao,
      storageMode: FiscalStorageMode.both,
      cbsRateBase: 0.9,
      ibsRateBase: 0.1,
      issqnRateDefault: 5,
      cloudEnabled: true,
      cloudBucketHint: 'marthi-fiscal',
      localRootPath: 'C:\\Marthi\\Fiscal',
      localXmlPath: 'C:\\Marthi\\Fiscal\\XML',
      localLogPath: 'C:\\Marthi\\Fiscal\\LOG',
      localPdfPath: 'C:\\Marthi\\Fiscal\\PDF',
      localPdvPath: 'C:\\Marthi\\Fiscal\\PDV',
    },
  });

  const seedCsts = [
    { code: '000', name: 'Tributação integral', description: 'CST IBS/CBS — tributação integral' },
    { code: '010', name: 'Tributação com alíquotas uniformes setoriais', description: '' },
    { code: '011', name: 'Tributação com alíquotas uniformes setoriais reduzidas', description: '' },
    { code: '200', name: 'Alíquota reduzida', description: 'Redução de alíquota IBS/CBS' },
    { code: '220', name: 'Alíquota reduzida com redutor de base', description: '' },
    { code: '400', name: 'Isenção', description: '' },
    { code: '410', name: 'Imunidade e não incidência', description: '' },
    { code: '510', name: 'Diferimento', description: '' },
    { code: '550', name: 'Suspensão', description: '' },
    { code: '800', name: 'Transferência de crédito', description: '' },
    { code: '810', name: 'Ajuste de IBS/CBS', description: '' },
    { code: '820', name: 'Tributação em regime específico', description: '' },
    { code: '830', name: 'Exclusão da BC', description: '' },
  ];
  for (const item of seedCsts) {
    await prisma.fiscalCstCode.upsert({
      where: { storeId_code: { storeId: STORE_ID, code: item.code } },
      update: {},
      create: { storeId: STORE_ID, ...item, active: true },
    });
  }

  const seedClasses = [
    { code: '000001', cstCode: '000', name: 'Situações tributadas integralmente pelo IBS e pela CBS', description: 'Classificação padrão' },
    { code: '200001', cstCode: '200', name: 'Aquisições e importações com redução de alíquota', description: '' },
    { code: '200002', cstCode: '200', name: 'Fornecimentos com redução de alíquota', description: '' },
    { code: '200003', cstCode: '200', name: 'Redução de alíquota — cestas básicas', description: '' },
    { code: '410001', cstCode: '410', name: 'Imunidade e não incidência', description: '' },
    { code: '550001', cstCode: '550', name: 'Exportações de bens materiais', description: '' },
    { code: '620001', cstCode: '620', name: 'Tributação monofásica sobre combustíveis', description: '' },
    { code: '820001', cstCode: '820', name: 'Regime específico — serviços financeiros', description: '' },
    { code: '830001', cstCode: '830', name: 'Exclusão da BC — energia elétrica', description: '' },
  ];
  for (const item of seedClasses) {
    await prisma.fiscalCClassTrib.upsert({
      where: { storeId_code: { storeId: STORE_ID, code: item.code } },
      update: {},
      create: { storeId: STORE_ID, ...item, active: true },
    });
  }

  await prisma.fiscalTaxTablesMeta.upsert({
    where: { storeId: STORE_ID },
    update: {},
    create: {
      storeId: STORE_ID,
      lastSyncSource: FiscalTaxSyncSource.seed,
      lastSyncMessage:
        'Tabelas iniciais (seed). Sincronize com a API SVRS quando o certificado estiver no Nest.',
    },
  });

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
