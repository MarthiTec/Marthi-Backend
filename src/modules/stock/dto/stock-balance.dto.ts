import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateStockBalanceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(180)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  warehouseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  warehouseName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  responsibleUser?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  duplicateRule?: 'sum' | 'overwrite';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateStockBalanceItemsDto {
  @ApiProperty()
  items!: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  summary?: any;
}

export class ApplyStockBalanceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
