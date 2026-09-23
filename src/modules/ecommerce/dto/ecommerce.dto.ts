import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  EcommerceChannelId,
  EcommerceListingStatus,
  EcommerceOrderStatus,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateEcommerceChannelDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(180)
  storeName?: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: { type: 'string' } })
  @IsOptional()
  @IsObject()
  credentials?: Record<string, string>;
}

export class ConnectEcommerceChannelDto {
  @ApiPropertyOptional({ type: 'object', additionalProperties: { type: 'string' } })
  @IsOptional()
  @IsObject()
  credentials?: Record<string, string>;
}

export class CreateEcommerceListingDto {
  @ApiProperty({ enum: EcommerceChannelId })
  @IsEnum(EcommerceChannelId)
  channelId!: EcommerceChannelId;

  @ApiProperty()
  @IsString()
  stockId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  externalId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(180)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  sku?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  qty?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({ enum: EcommerceListingStatus })
  @IsOptional()
  @IsEnum(EcommerceListingStatus)
  status?: EcommerceListingStatus;
}

export class UpdateEcommerceListingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  qty?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({ enum: EcommerceListingStatus })
  @IsOptional()
  @IsEnum(EcommerceListingStatus)
  status?: EcommerceListingStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  message?: string;
}
