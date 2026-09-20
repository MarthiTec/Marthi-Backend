import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { DocumentType, ModuleId, PlanId } from '@prisma/client';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  MinLength,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

const PLAN_ALIASES: Record<string, PlanId> = {
  start: PlanId.bronze,
  growth: PlanId.silver,
  scale: PlanId.golden,
  bronze: PlanId.bronze,
  silver: PlanId.silver,
  golden: PlanId.golden,
};

const MODULE_ALIASES: Record<string, ModuleId> = {
  presales: ModuleId.erp,
  totem: ModuleId.totem,
  os: ModuleId.os,
  erp: ModuleId.erp,
  fiscal: ModuleId.fiscal,
  ecommerce: ModuleId.ecommerce,
};

export const GOLDEN_MODULES: ModuleId[] = [
  ModuleId.totem,
  ModuleId.os,
  ModuleId.erp,
  ModuleId.fiscal,
  ModuleId.ecommerce,
];

@ValidatorConstraint({ name: 'partnerPlanModules', async: false })
class PartnerPlanModulesConstraint implements ValidatorConstraintInterface {
  validate(modules: ModuleId[], args: ValidationArguments) {
    const planId = (args.object as PartnerSignupDto).planId;
    const unique = new Set(modules);
    if (!modules?.length || unique.size !== modules.length) return false;
    if (planId === PlanId.bronze) return modules.length === 1;
    if (planId === PlanId.silver)
      return modules.length >= 1 && modules.length <= 2;
    if (planId === PlanId.golden) {
      return GOLDEN_MODULES.every((item) => modules.includes(item));
    }
    return false;
  }

  defaultMessage(args: ValidationArguments) {
    const planId = (args.object as PartnerSignupDto).planId;
    if (planId === PlanId.bronze) return 'Plano Bronze: exatamente 1 módulo.';
    if (planId === PlanId.silver) return 'Plano Silver: 1 ou 2 módulos.';
    if (planId === PlanId.golden)
      return 'Plano Golden: todos os 5 módulos devem estar liberados.';
    return 'Módulos inválidos para o plano.';
  }
}

export class PartnerSignupDto {
  @ApiProperty({ enum: PlanId })
  @Transform(({ value }) => PLAN_ALIASES[String(value)] ?? value)
  @IsEnum(PlanId)
  planId!: PlanId;

  @ApiProperty({ enum: ModuleId, isArray: true })
  @Transform(({ value }) =>
    Array.isArray(value)
      ? value.map((item) => MODULE_ALIASES[String(item)] ?? item)
      : value,
  )
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(ModuleId, { each: true })
  @Validate(PartnerPlanModulesConstraint)
  modules!: ModuleId[];

  @ApiProperty({ enum: DocumentType })
  @IsEnum(DocumentType)
  documentType!: DocumentType;

  @IsString()
  @MinLength(11)
  @MaxLength(18)
  document!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(180)
  legalName!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(180)
  tradeName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(20)
  phone!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(9)
  zipCode!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(180)
  street!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(20)
  number!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  complement?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  district!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  city!: string;

  @IsString()
  @Length(2, 2)
  state!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  segment?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  contactName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  contactRole?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
