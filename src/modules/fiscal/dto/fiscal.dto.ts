import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  FiscalDocFamily,
  FiscalSefazEnvironment,
  FiscalStorageMode,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class UpdateIssuerSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(180)
  emitenteName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(18)
  cnpj?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  ie?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  im?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10)
  cMun?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  municipio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2)
  uf?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(180)
  certificateFileName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  certificateBase64?: string;

  @ApiPropertyOptional({
    description: 'Aceito no PUT; gravado criptografado. Nunca devolvido no GET.',
  })
  @IsOptional()
  @IsString()
  certificatePassword?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(6)
  cscId?: string;

  @ApiPropertyOptional({
    description: 'Aceito no PUT; gravado criptografado. GET devolve vazio.',
  })
  @IsOptional()
  @IsString()
  cscToken?: string;

  @ApiPropertyOptional({ enum: FiscalSefazEnvironment })
  @IsOptional()
  @IsEnum(FiscalSefazEnvironment)
  environment?: FiscalSefazEnvironment;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10)
  nfeSeries?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10)
  nfceSeries?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10)
  nfseSeries?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10)
  cteSeries?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10)
  mdfeSeries?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  cbsRateBase?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  ibsRateBase?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  issqnRateDefault?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  issqnRetainedRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  issqnMunicipalCode?: string;

  @ApiPropertyOptional({ enum: FiscalStorageMode })
  @IsOptional()
  @IsEnum(FiscalStorageMode)
  storageMode?: FiscalStorageMode;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  localRootPath?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  localXmlPath?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  localLogPath?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  localPdfPath?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  localPdvPath?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  cloudEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  cloudBucketHint?: string;
}

export class CreateFiscalLogDto {
  @ApiProperty({ enum: FiscalDocFamily })
  @IsEnum(FiscalDocFamily)
  family!: FiscalDocFamily;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  action!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  detail!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  refId?: string;
}

export class TaxCstDto {
  @ApiProperty()
  @IsString()
  code!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class TaxCClassDto {
  @ApiProperty()
  @IsString()
  code!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cstCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  linkLc?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class ReplaceTaxTablesDto {
  @ApiProperty({ type: [TaxCstDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaxCstDto)
  csts!: TaxCstDto[];

  @ApiProperty({ type: [TaxCClassDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaxCClassDto)
  cClassTribs!: TaxCClassDto[];
}
