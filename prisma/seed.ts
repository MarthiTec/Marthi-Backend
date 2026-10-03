import {
  AuthProvider,
  DocumentType,
  EmployeeRole,
  ModuleId,
  PaymentType,
  PlanId,
  PrismaClient,
  TotemMode,
  AccessArea,
  BankAccountType,
  FiscalSefazEnvironment,
  FiscalStorageMode,
  FiscalTaxSyncSource,
  EcommerceChannelId,
  EcommerceChannelKind,
  EcommerceConnectionStatus,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const STORE_ID = 'STR-CELL-PONTO';

/** Catálogo falso de vitrine. O seed apaga se ainda existir no banco. */
const DEMO_TOTEM_PRODUCT_IDS = ['1', '2', '3', '4', '5', '6', '7', '19'];

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
    update: {
      mode: TotemMode.kiosk,
      exitPassword: 'cellponto',
      shareStockWithErp: true,
    },
    create: {
      storeId: STORE_ID,
      mode: TotemMode.kiosk,
      exitPassword: 'cellponto',
      shareStockWithErp: true,
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

  const adminEmail = 'marthi.tecnologia@gmail.com';
  const adminPassHash = await bcrypt.hash('123', 12);
  const adminUserId = `password:${adminEmail}`;
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash: adminPassHash,
      provider: AuthProvider.password,
      storeId: STORE_ID,
    },
    create: {
      id: adminUserId,
      storeId: STORE_ID,
      email: adminEmail,
      name: 'Marthi Tecnologia',
      picture: null,
      provider: AuthProvider.password,
      passwordHash: adminPassHash,
    },
  });

  await prisma.operatorProfile.upsert({
    where: { userId: adminUserId },
    update: {},
    create: {
      userId: adminUserId,
      displayName: 'Marthi Tecnologia',
      role: 'Administrador',
    },
  });

  await prisma.employee.upsert({
    where: { id: 'EMP-MARTHI-ADMIN' },
    update: {
      role: EmployeeRole.admin,
      userEmail: adminEmail,
      email: adminEmail,
      accessAreas: [
        AccessArea.painel,
        AccessArea.totem,
        AccessArea.pdv,
        AccessArea.os,
        AccessArea.erp,
        AccessArea.fiscal,
        AccessArea.ecommerce,
      ],
      active: true,
    },
    create: {
      id: 'EMP-MARTHI-ADMIN',
      storeId: STORE_ID,
      name: 'Marthi Tecnologia',
      role: EmployeeRole.admin,
      userEmail: adminEmail,
      email: adminEmail,
      accessAreas: [
        AccessArea.painel,
        AccessArea.totem,
        AccessArea.pdv,
        AccessArea.os,
        AccessArea.erp,
        AccessArea.fiscal,
        AccessArea.ecommerce,
      ],
      active: true,
    },
  });

  await prisma.employee.upsert({
    where: { id: 'EMP-TESTE-ADMIN' },
    update: {
      role: EmployeeRole.admin,
      userEmail: email,
      email,
      accessAreas: [
        AccessArea.painel,
        AccessArea.totem,
        AccessArea.pdv,
        AccessArea.os,
        AccessArea.erp,
        AccessArea.fiscal,
        AccessArea.ecommerce,
      ],
      active: true,
    },
    create: {
      id: 'EMP-TESTE-ADMIN',
      storeId: STORE_ID,
      name: 'Marthi Teste Admin',
      role: EmployeeRole.admin,
      userEmail: email,
      email,
      accessAreas: [
        AccessArea.painel,
        AccessArea.totem,
        AccessArea.pdv,
        AccessArea.os,
        AccessArea.erp,
        AccessArea.fiscal,
        AccessArea.ecommerce,
      ],
      active: true,
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
    update: { priceDelta: 0 },
    create: {
      id: 'ATTR-RET-ENCOMENDA',
      attributeId: pickupAttr.id,
      value: 'Por encomenda',
      priceDelta: 0,
      sort: 1,
    },
  });

  await prisma.stockItem.updateMany({
    where: { productId: { in: DEMO_TOTEM_PRODUCT_IDS } },
    data: { productId: null },
  });
  await prisma.product.deleteMany({
    where: { id: { in: DEMO_TOTEM_PRODUCT_IDS } },
  });

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

  // Limpeza de cadastros legados ou sintéticos de testes (mantém estritamente os logins oficiais)
  await prisma.customer.deleteMany({
    where: { id: { in: ['CLI-ANA', 'CLI-CARLOS'] } },
  });
  await prisma.employee.deleteMany({
    where: {
      id: { in: ['EMP-ANA', 'EMP-ADMIN', 'EMP-GILVAN-01', 'EMP-MARIANA-01'] },
    },
  });
  await prisma.seller.deleteMany({
    where: { id: { in: ['VEN-BRUNO'] } },
  });
  await prisma.supplier.deleteMany({
    where: { id: { in: ['FOR-CELSUL'] } },
  });
  await prisma.bankAccount.deleteMany({
    where: { id: { in: ['ACC-CAIXA', 'ACC-OPER'] } },
  });
  await prisma.warehouse.deleteMany({
    where: { id: { in: ['ALX-01', 'ALX-BANC'] } },
  });
  await prisma.user.deleteMany({
    where: {
      email: {
        in: [
          'marianaveigatav@gmail.com',
          'gilvanteodo@gmail.com',
          'gilvancellponto@gmail.com',
        ],
      },
    },
  });

  await prisma.stockItem.deleteMany({
    where: {
      id: { in: ['STK-TELA', 'STK-BATERIA', 'STK-DEMO-APARELHO'] },
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
    {
      code: '000',
      name: 'Tributação integral',
      description: 'CST IBS/CBS — tributação integral',
    },
    {
      code: '010',
      name: 'Tributação com alíquotas uniformes setoriais',
      description: '',
    },
    {
      code: '011',
      name: 'Tributação com alíquotas uniformes setoriais reduzidas',
      description: '',
    },
    {
      code: '200',
      name: 'Alíquota reduzida',
      description: 'Redução de alíquota IBS/CBS',
    },
    {
      code: '220',
      name: 'Alíquota reduzida com redutor de base',
      description: '',
    },
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
    {
      code: '000001',
      cstCode: '000',
      name: 'Situações tributadas integralmente pelo IBS e pela CBS',
      description: 'Classificação padrão',
    },
    {
      code: '200001',
      cstCode: '200',
      name: 'Aquisições e importações com redução de alíquota',
      description: '',
    },
    {
      code: '200002',
      cstCode: '200',
      name: 'Fornecimentos com redução de alíquota',
      description: '',
    },
    {
      code: '200003',
      cstCode: '200',
      name: 'Redução de alíquota — cestas básicas',
      description: '',
    },
    {
      code: '410001',
      cstCode: '410',
      name: 'Imunidade e não incidência',
      description: '',
    },
    {
      code: '550001',
      cstCode: '550',
      name: 'Exportações de bens materiais',
      description: '',
    },
    {
      code: '620001',
      cstCode: '620',
      name: 'Tributação monofásica sobre combustíveis',
      description: '',
    },
    {
      code: '820001',
      cstCode: '820',
      name: 'Regime específico — serviços financeiros',
      description: '',
    },
    {
      code: '830001',
      cstCode: '830',
      name: 'Exclusão da BC — energia elétrica',
      description: '',
    },
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

  const ecommerceSeed: Array<{
    channelId: EcommerceChannelId;
    kind: EcommerceChannelKind;
    message: string;
  }> = [
    {
      channelId: EcommerceChannelId.mercadolivre,
      kind: EcommerceChannelKind.marketplace,
      message: 'Preencha App ID, Secret e tokens OAuth.',
    },
    {
      channelId: EcommerceChannelId.shopee,
      kind: EcommerceChannelKind.marketplace,
      message: 'Informe Partner ID, Partner Key e Shop ID.',
    },
    {
      channelId: EcommerceChannelId.ifood,
      kind: EcommerceChannelKind.marketplace,
      message: 'Client ID, Secret e Merchant ID obrigatórios.',
    },
    {
      channelId: EcommerceChannelId.amazon,
      kind: EcommerceChannelKind.marketplace,
      message: 'Configure LWA + Seller ID + Marketplace ID.',
    },
    {
      channelId: EcommerceChannelId.tray,
      kind: EcommerceChannelKind.hub,
      message: 'URL da loja + Consumer Key/Secret.',
    },
  ];
  for (const item of ecommerceSeed) {
    await prisma.ecommerceChannelState.upsert({
      where: {
        storeId_channelId: { storeId: STORE_ID, channelId: item.channelId },
      },
      update: {},
      create: {
        storeId: STORE_ID,
        channelId: item.channelId,
        kind: item.kind,
        status: EcommerceConnectionStatus.disconnected,
        message: item.message,
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
