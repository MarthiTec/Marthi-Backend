import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CrmActivityKind, CrmLeadSource, CrmStage } from '@prisma/client';
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

export class CreateCrmLeadDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(180)
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  whatsapp?: string;

  @ApiProperty({ enum: CrmLeadSource })
  @IsEnum(CrmLeadSource)
  source!: CrmLeadSource;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  interest?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  value?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalRef?: string;

  @ApiPropertyOptional({ enum: CrmStage })
  @IsOptional()
  @IsEnum(CrmStage)
  stage?: CrmStage;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  graduation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  polo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceInfo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hideContact?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ownerSellerId?: string;
}

export class UpdateCrmLeadDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  whatsapp?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  interest?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  value?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  graduation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  polo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceInfo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hideContact?: boolean;
}

export class ClaimCrmLeadDto {
  @ApiProperty()
  @IsString()
  sellerId!: string;
}

export class MoveCrmLeadDto {
  @ApiProperty({ enum: CrmStage })
  @IsEnum(CrmStage)
  stage!: CrmStage;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sellerId?: string;
}

export class CreateCrmActivityDto {
  @ApiProperty({ enum: CrmActivityKind })
  @IsEnum(CrmActivityKind)
  kind!: CrmActivityKind;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  body!: string;

  @ApiProperty()
  @IsString()
  sellerId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dueAt?: string;
}

export class CreateCrmLeadMessageDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  text?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body?: string;

  @ApiProperty()
  @IsString()
  sellerId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  asLead?: boolean;
}

export class CreateSellerMessageDto {
  @ApiProperty()
  @IsString()
  fromSellerId!: string;

  @ApiProperty()
  @IsString()
  toSellerId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  text?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  body?: string;
}

export class UpdateCrmProfileDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  displayName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(24)
  handle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coverUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  specialty?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  whatsapp?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  instagram?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  linkedin?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  publicProfile?: boolean;
}
