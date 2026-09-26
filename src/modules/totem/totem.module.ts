import { Module } from '@nestjs/common';
import { AttributesModule } from '../attributes/attributes.module';
import { StoreModule } from '../store/store.module';
import { TotemController } from './totem.controller';
import { TotemService } from './totem.service';

@Module({
  imports: [StoreModule, AttributesModule],
  controllers: [TotemController],
  providers: [TotemService],
})
export class TotemModule {}
