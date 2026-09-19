import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class GoogleLoginDto {
  @ApiProperty()
  @IsString()
  @MinLength(10)
  idToken!: string;
}
