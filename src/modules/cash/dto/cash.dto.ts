import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CashBeneficiaryType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class OpenCashSessionDto {
  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  openingFloat!: number;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  operatorName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  note?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  openedAt?: string;
}

export class CashMoneyDto {
  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  note?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  reason?: string;

  @ApiPropertyOptional({ enum: CashBeneficiaryType })
  @IsOptional()
  @IsEnum(CashBeneficiaryType)
  beneficiaryType?: CashBeneficiaryType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  beneficiaryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(180)
  beneficiaryName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  operatorName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  at?: string;
}

export class CashDrawerDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  note?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  operatorName?: string;
}

export class CloseCashSessionDto {
  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  countedCash!: number;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  operatorName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  note?: string;
}

export class ReopenCashSessionDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  operatorName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  note?: string;
}

export class CreateStoreCreditDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  customerName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  customerPhone?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  note?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  operatorName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  affectCash?: boolean;
}

export class UseStoreCreditDto {
  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  operatorName?: string;
}

export class ExchangeLineDto {
  @ApiProperty()
  @IsString()
  stockId!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  qty!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice!: number;
}

export class CreateExchangeDto {
  @ApiProperty()
  @IsString()
  @MaxLength(40)
  orderId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  customerName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  customerPhone?: string;

  @ApiProperty({ type: [ExchangeLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExchangeLineDto)
  returnLines!: ExchangeLineDto[];

  @ApiProperty({ type: [ExchangeLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExchangeLineDto)
  outLines!: ExchangeLineDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  note?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  operatorName?: string;

  @ApiPropertyOptional({ enum: ['cash', 'credit'] })
  @IsOptional()
  @IsString()
  settleAs?: 'cash' | 'credit';
}
