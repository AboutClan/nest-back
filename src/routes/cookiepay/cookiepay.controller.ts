import {
  Body,
  Controller,
  Get,
  Headers,
  HttpException,
  HttpStatus,
  Param,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from 'src/decorator/Public';
import { assertInternalKey } from 'src/utils/internalAuth';
import { CookiepayService } from './cookiepay.service';
import {
  CreateCookiepayOrderDto,
  FinalizeCookiepayOrderDto,
  MarkCookiepayResultDto,
} from './cookiepay.dto';

@ApiTags('cookiepay')
@Controller('cookiepay')
export class CookiepayController {
  constructor(private readonly cookiepayService: CookiepayService) {}

  @Public()
  @Post('order')
  @UsePipes(new ValidationPipe({ transform: true }))
  async createOrder(
    @Headers('x-internal-key') key: string,
    @Body() dto: CreateCookiepayOrderDto,
  ) {
    assertInternalKey(key);
    const order = await this.cookiepayService.createOrder(dto);
    return { ok: true, orderNo: order.orderNo };
  }

  @Public()
  @Get('order/:orderNo')
  async getOrder(
    @Headers('x-internal-key') key: string,
    @Param('orderNo') orderNo: string,
  ) {
    assertInternalKey(key);
    const order = await this.cookiepayService.getOrder(orderNo);
    if (!order) throw new HttpException('NOT_FOUND', HttpStatus.NOT_FOUND);
    return { status: order.status, amount: order.amount, type: order.type };
  }

  @Public()
  @Post('mark-result')
  @UsePipes(new ValidationPipe({ transform: true }))
  async markResult(
    @Headers('x-internal-key') key: string,
    @Body() dto: MarkCookiepayResultDto,
  ) {
    assertInternalKey(key);
    return this.cookiepayService.markResult(dto);
  }

  @Public()
  @Post('finalize')
  @UsePipes(new ValidationPipe({ transform: true }))
  async finalize(
    @Headers('x-internal-key') key: string,
    @Body() dto: FinalizeCookiepayOrderDto,
  ) {
    assertInternalKey(key);
    return this.cookiepayService.finalize(dto.orderNo);
  }
}
