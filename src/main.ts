import { NestFactory } from '@nestjs/core';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { setupDbTunnel } from './common/utils/db-tunnel';

process.stderr.write(`[marthi] node starting ${process.version}\n`);

function applyMigrationsAndSeed() {
  const prismaCli = join(
    process.cwd(),
    'node_modules',
    'prisma',
    'build',
    'index.js',
  );
  process.stderr.write('[marthi] prisma migrate deploy\n');
  try {
    execFileSync(process.execPath, [prismaCli, 'migrate', 'deploy'], {
      stdio: 'inherit',
      env: process.env,
    });
  } catch (err) {
    console.error('[marthi] migrate deploy failed', err);
  }

  process.stderr.write('[marthi] prisma db seed\n');
  try {
    execFileSync(process.execPath, [prismaCli, 'db', 'seed'], {
      stdio: 'inherit',
      env: process.env,
    });
  } catch (err) {
    console.error('[marthi] db seed failed or skipped', err);
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const config = app.get(ConfigService);

  const apiPrefix = config.getOrThrow<string>('API_PREFIX');
  app.setGlobalPrefix(apiPrefix, {
    exclude: [
      { path: 'health', method: RequestMethod.GET },
      { path: '/', method: RequestMethod.GET },
    ],
  });

  app.use(helmet());

  const corsOrigins = config
    .get<string>('CORS_ORIGINS', '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin) return callback(null, true);
      const isDiscloud =
        origin.endsWith('.discloud.app') || origin.endsWith('.discloud.dev');
      const isLocal =
        origin.includes('localhost') || origin.includes('127.0.0.1');
      if (
        corsOrigins.length === 0 ||
        corsOrigins.includes(origin) ||
        isDiscloud ||
        isLocal
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  if (config.get('SWAGGER_ENABLED') === 'true') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Marthi Totem API')
      .setDescription(
        'Backend da plataforma Marthi (totem + painel ERP/OS/PDV). Fotos e assinatura da OS são data URL em TEXT (MVP, ~400kb).',
      )
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`${apiPrefix}/docs`, app, document);
  }

  setupDbTunnel(app.getHttpServer());

  const port = Number(process.env.PORT || config.get('PORT') || 8080);
  await app.listen(port, '0.0.0.0');
  process.stderr.write(`[marthi] listening on 0.0.0.0:${port}\n`);

  applyMigrationsAndSeed();
}

void bootstrap().catch((error: unknown) => {
  console.error('[marthi] bootstrap failed', error);
  process.exit(1);
});
