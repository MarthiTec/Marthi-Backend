import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CardapioOrderStatus, KitchenTableStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateKitchenTableDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  number!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional({ enum: KitchenTableStatus })
  @IsOptional()
  @IsEnum(KitchenTableStatus)
  status?: KitchenTableStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateKitchenTableDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  number?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional({ enum: KitchenTableStatus })
  @IsOptional()
  @IsEnum(KitchenTableStatus)
  status?: KitchenTableStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  activeOrder?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateKitchenOrderStatusDto {
  @ApiProperty({ enum: CardapioOrderStatus })
  @IsEnum(CardapioOrderStatus)
  status!: CardapioOrderStatus;
}
