import { Controller, Get, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { SkipResponseWrap } from '../../common/decorators/skip-response-wrap.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('health')
@SkipThrottle()
@SkipResponseWrap()
@Controller()
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Get(['health', '/'])
  async check(@Res({ passthrough: true }) response: Response) {
    const configured = Boolean(this.config.get('DATABASE_URL'));
    let connected = false;
    let error: string | null = null;

    if (configured) {
      try {
        await this.prisma.$queryRaw`SELECT 1`;
        connected = true;
      } catch (cause) {
        error =
          cause instanceof Error ? cause.message : 'Falha ao conectar no banco';
      }
    }

    const ok = connected || !configured;
    response.status(configured && !connected ? 503 : 200);

    return {
      success: ok,
      data: {
        service: 'marthi-totem-api',
        status: ok ? 'ok' : 'degraded',
        time: new Date().toISOString(),
        database: { configured, connected, error },
      },
    };
  }
}
