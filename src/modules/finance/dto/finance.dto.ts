import { ApiProperty } from '@nestjs/swagger';
import { FinanceType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateFinanceDto {
  @ApiProperty({ enum: FinanceType })
  @IsEnum(FinanceType)
  type!: FinanceType;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(240)
  label!: string;
}
