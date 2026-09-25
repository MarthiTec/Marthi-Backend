import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ModuleId, PlanId, TotemMode } from '@prisma/client';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { DATA_URL_MAX_CHARS } from '../../../common/constants/uploads';

export class UpdateStorePlanDto {
  @ApiProperty({ enum: PlanId })
  @IsEnum(PlanId)
  planId!: PlanId;

  @ApiProperty({ enum: ModuleId, isArray: true })
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(ModuleId, { each: true })
  modules!: ModuleId[];
}

const TOTEM_VERTICALS = ['general', 'food', 'retail', 'phones', 'optics'] as const;
const TOTEM_LAYOUTS = ['standard', 'logoPromo'] as const;
const TOTEM_KEYBOARDS = ['top', 'bottom'] as const;

export class UpdateTotemSettingsDto {
  @ApiPropertyOptional({ enum: TotemMode })
  @IsOptional()
  @IsEnum(TotemMode)
  mode?: TotemMode;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  exitPassword?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  shareStockWithErp?: boolean;

  @ApiPropertyOptional({ enum: TOTEM_VERTICALS })
  @IsOptional()
  @IsIn([...TOTEM_VERTICALS])
  vertical?: (typeof TOTEM_VERTICALS)[number];

  @ApiPropertyOptional({ enum: [1, 2, 3, 4] })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  columns?: 1 | 2 | 3 | 4;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showAttractScreen?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  storeName?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(DATA_URL_MAX_CHARS)
  storeLogo?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(DATA_URL_MAX_CHARS)
  attractBackground?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(16)
  attractGradientColor?: string;

  @ApiPropertyOptional({ enum: TOTEM_LAYOUTS })
  @IsOptional()
  @IsIn([...TOTEM_LAYOUTS])
  attractLayout?: (typeof TOTEM_LAYOUTS)[number];

  @ApiPropertyOptional({ enum: TOTEM_KEYBOARDS })
  @IsOptional()
  @IsIn([...TOTEM_KEYBOARDS])
  keyboardPlacement?: (typeof TOTEM_KEYBOARDS)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  askCustomerName?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  offerFulfillment?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  printTicket?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  audioAssist?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  storeWhatsApp?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notifyCustomerOnLead?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  locationLabel?: string;
}
