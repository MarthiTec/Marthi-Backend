import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'teste@marthi.com.br' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '123' })
  @IsString()
  @MinLength(1)
  password!: string;
}
