import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { ConfirmLinkDto, RequestLinkDto } from './dto/link.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  list() {
    return this.customers.list();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  get(@Param('id') id: string) {
    return this.customers.findById(id);
  }

  // Customer-facing: issue a code to link a new channel identity to this
  // customer record (e.g. "prove this WhatsApp number is also you").
  @Post(':id/link-requests')
  requestLink(@Param('id') id: string, @Body() dto: RequestLinkDto) {
    return this.customers.requestLink(id, dto.targetChannel, dto.targetExternalId);
  }

  @Post('link-requests/confirm')
  confirmLink(@Body() dto: ConfirmLinkDto) {
    return this.customers.confirmLink(dto.code, dto.channel, dto.externalId);
  }
}
