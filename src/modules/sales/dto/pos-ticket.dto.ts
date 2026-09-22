import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TicketStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { TicketAttributeDto } from '../../totem/dto/totem-lead.dto';

export class CreatePosTicketDto {
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  color?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  storage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  fulfillment?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(80)
  payment!: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  installment?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  priceLabel?: string;
}

export class PatchPosTicketDto {
  @ApiProperty({ enum: TicketStatus })
  @IsEnum(TicketStatus)
  status!: TicketStatus;
}
