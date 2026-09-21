import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AssetDisposition,
  ChecklistMark,
  OsPriority,
  OsStatus,
  StockKind,
  WorkOrderPhotoKind,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { DATA_URL_MAX_CHARS } from '../../../common/constants/uploads';

export class CreateWorkOrderDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  customerName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  customerPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(18)
  customerDocument?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(180)
  customerEmail?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  itemName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  itemBrand?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  itemModel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  itemColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  itemRef?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  devicePassword?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accessories?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  conditionOnEntry?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  defect!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  diagnosis?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  estimatedReadyAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  technician?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sellerId?: string;

  @ApiPropertyOptional({ enum: OsPriority })
  @IsOptional()
  @IsEnum(OsPriority)
  priority?: OsPriority;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  labor?: number;
}

export class UpdateWorkOrderDto {
  @ApiPropertyOptional({ enum: OsStatus })
  @IsOptional()
  @IsEnum(OsStatus)
  status?: OsStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  labor?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  diagnosis?: string;

  @ApiPropertyOptional({ enum: OsPriority })
  @IsOptional()
  @IsEnum(OsPriority)
  priority?: OsPriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  technician?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sellerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  estimatedReadyAt?: string;

  @ApiPropertyOptional({ enum: AssetDisposition })
  @IsOptional()
  @IsEnum(AssetDisposition)
  assetDisposition?: AssetDisposition;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  quoteNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  quoteValidUntil?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerDocument?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  itemName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  itemBrand?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  itemModel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  itemColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  itemRef?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  devicePassword?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accessories?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  conditionOnEntry?: string;
}

export class ConsumePartDto {
  @ApiProperty()
  @IsString()
  stockId!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  qty!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice?: number;
}

export class PurchaseAssetDto {
  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cost!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imei?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: StockKind })
  @IsOptional()
  @IsEnum(StockKind)
  kind?: StockKind;
}

export class AddPhotoDto {
  @ApiProperty({ enum: WorkOrderPhotoKind })
  @IsEnum(WorkOrderPhotoKind)
  kind!: WorkOrderPhotoKind;

  @ApiProperty({ description: 'Data URL JPEG/PNG (MVP, máx. ~400kb)' })
  @IsString()
  @MaxLength(DATA_URL_MAX_CHARS)
  dataUrl!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(180)
  caption?: string;
}

export class PatchChecklistDto {
  @ApiPropertyOptional({ enum: ChecklistMark })
  @IsOptional()
  @IsEnum(ChecklistMark)
  mark?: ChecklistMark;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  note?: string;
}

export class SignatureDto {
  @ApiProperty({ description: 'Data URL PNG da assinatura' })
  @IsString()
  @MaxLength(DATA_URL_MAX_CHARS)
  dataUrl!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(180)
  signedName?: string;
}

export class QuoteDraftDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  validUntil?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  labor?: number;
}

export class QuoteApproveDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  moveToProgress?: boolean;
}
