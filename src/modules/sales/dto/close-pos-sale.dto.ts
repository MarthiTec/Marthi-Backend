import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class PosSaleLineDto {
  @ApiProperty()
  @IsString()
  stockId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  name!: string;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  imei?: string;
}

export class ClosePosSaleDto {
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  ticketId?: string | null;

  @ApiProperty()
  @IsString()
  @MaxLength(180)
  customerName!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(20)
  customerPhone!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(18)
  customerDocument?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(80)
  paymentName!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(80)
  priceTableName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentMethodId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  priceTableId?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discount!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  surcharge!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sellerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sellerName?: string;

  @ApiProperty({ type: [PosSaleLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PosSaleLineDto)
  lines!: PosSaleLineDto[];
}
