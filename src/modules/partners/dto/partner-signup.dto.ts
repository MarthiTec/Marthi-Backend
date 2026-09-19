import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'partnerPlanModules', async: false })
class PartnerPlanModulesConstraint implements ValidatorConstraintInterface {
  validate(modules: ModuleId[], args: ValidationArguments) {
    const planId = (args.object as PartnerSignupDto).planId;
    const unique = new Set(modules);
    if (unique.size !== modules.length) return false;
    if (planId === PlanId.start) return modules.length === 1;
    if (planId === PlanId.growth)
      return modules.length >= 1 && modules.length <= 2;
    if (planId === PlanId.scale) {
      return (['totem', 'presales', 'os', 'erp'] as ModuleId[]).every((item) =>
        modules.includes(item),
      );
    }
    return false;
  }

  defaultMessage(args: ValidationArguments) {
    const planId = (args.object as PartnerSignupDto).planId;
    if (planId === PlanId.start) return 'Plano Start: exatamente 1 módulo.';
    if (planId === PlanId.growth) return 'Plano Growth: no máximo 2 módulos.';
    if (planId === PlanId.scale)
      return 'Plano Scale: todos os módulos devem estar liberados.';
    return 'Módulos inválidos para o plano.';
  }
}

export class PartnerSignupDto {
  @ApiProperty({ enum: PlanId })
  @IsEnum(PlanId)
  planId!: PlanId;

  @ApiProperty({ enum: ModuleId, isArray: true })
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
