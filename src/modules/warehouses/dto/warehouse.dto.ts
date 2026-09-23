import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WarehouseMoveKind } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CreateWarehouseDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateWarehouseDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class CreateLotDto {
  @ApiProperty()
  @IsString()
  stockId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(180)
  stockName?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  lotNumber!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  manufacturingDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  expiryDate?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  qty!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(180)
  supplierName?: string;

  @ApiProperty()
  @IsString()
  warehouseId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class UpdateLotDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  qty!: number;
}

export class KitItemDto {
  @ApiProperty()
  @IsString()
  stockId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  stockName?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  qty!: number;
}

export class CreateKitDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  sku?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parentStockId?: string;

  @ApiProperty({ type: [KitItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KitItemDto)
  items!: KitItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateKitDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  sku?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parentStockId?: string;

  @ApiPropertyOptional({ type: [KitItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KitItemDto)
  items?: KitItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class CreateWarehouseMoveDto {
  @ApiProperty({ enum: WarehouseMoveKind })
  @IsEnum(WarehouseMoveKind)
  kind!: WarehouseMoveKind;

  @ApiProperty()
  @IsString()
  stockId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fromWarehouseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  toWarehouseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lotId?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  qty!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  note?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  operatorName?: string;
}
