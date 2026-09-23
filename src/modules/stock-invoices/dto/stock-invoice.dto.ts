import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FiscalDocPurpose, StockInvoiceKind } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export class CreateStockInvoiceDto {
  @ApiProperty({ enum: StockInvoiceKind })
  @IsEnum(StockInvoiceKind)
  kind!: StockInvoiceKind;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  number?: string;

  @ApiPropertyOptional({ enum: FiscalDocPurpose })
  @IsOptional()
  @IsEnum(FiscalDocPurpose)
  documentPurpose?: FiscalDocPurpose;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(180)
  customerName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(DATE)
  issuedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class UpdateStockInvoiceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  number?: string;

  @ApiPropertyOptional({ enum: FiscalDocPurpose })
  @IsOptional()
  @IsEnum(FiscalDocPurpose)
  documentPurpose?: FiscalDocPurpose;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(180)
  customerName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(DATE)
  issuedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class AddStockInvoiceLineDto {
  @ApiProperty()
  @IsString()
  stockId!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  qty!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice?: number;
}
