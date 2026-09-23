import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class TotemClickDto {
  @ApiProperty({ description: 'ID do produto (string ou número do catálogo totem)' })
  @Transform(({ value }) => String(value ?? '').trim())
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  productId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  productName!: string;
}
