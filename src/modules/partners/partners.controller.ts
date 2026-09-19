import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { PartnerSignupDto } from './dto/partner-signup.dto';
import { PartnersService } from './partners.service';

@ApiTags('partners')
@Controller('partners')
export class PartnersController {
  constructor(private readonly partnersService: PartnersService) {}

  @Public()
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Cadastro público de parceiro' })
  signup(@Body() dto: PartnerSignupDto) {
    return this.partnersService.signup(dto);
  }

  @ApiBearerAuth()
  @Get('signup/pending')
  @ApiOperation({ summary: 'Fila de cadastros pendentes' })
  pending() {
    return this.partnersService.pending();
  }
}
