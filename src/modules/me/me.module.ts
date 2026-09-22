import { Module } from '@nestjs/common';
import { RegistryModule } from '../registry/registry.module';
import { MeController } from './me.controller';
import { MeService } from './me.service';

@Module({
  imports: [RegistryModule],
  controllers: [MeController],
  providers: [MeService],
})
export class MeModule {}
