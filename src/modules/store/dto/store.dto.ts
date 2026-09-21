import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ModuleId, PlanId, TotemMode } from '@prisma/client';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateStorePlanDto {
  @ApiProperty({ enum: PlanId })
  @IsEnum(PlanId)
  planId!: PlanId;

  @ApiProperty({ enum: ModuleId, isArray: true })
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(ModuleId, { each: true })
  modules!: ModuleId[];
}

export class UpdateTotemSettingsDto {
  @ApiPropertyOptional({ enum: TotemMode })
  @IsOptional()
  @IsEnum(TotemMode)
  mode?: TotemMode;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  exitPassword?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  shareStockWithErp?: boolean;
}
