import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class TicketAttributeDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  id!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(120)
  value!: string;
}

export class TotemLeadDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  customerName!: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  @MaxLength(20)
  customerPhone!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  productName!: string;

  @ApiPropertyOptional({ type: [TicketAttributeDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TicketAttributeDto)
  attributes?: TicketAttributeDto[];

  @ApiProperty()
  @IsString()
  @MaxLength(80)
  color!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(80)
  storage!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(80)
  fulfillment!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(80)
  payment!: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  installment?: string | null;

  @ApiProperty()
  @IsString()
  @MaxLength(80)
  priceLabel!: string;
}
