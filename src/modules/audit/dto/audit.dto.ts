import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuditKind } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateAuditDto {
  @ApiProperty({ enum: AuditKind })
  @IsEnum(AuditKind)
  kind!: AuditKind;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(180)
  actorName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(180)
  actorEmail?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  action!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  detail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  path?: string;
}
