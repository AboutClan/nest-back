import {
  Body,
  Controller,
  Headers,
  Inject,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { Public } from 'src/decorator/Public';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('complete')
  async complete(
    @Body('paymentId') paymentId: string,
    @Body('order') order: string,
  ) {
    await this.paymentService.complete(paymentId, order);
    return 'success';
  }

  @Public()
  @Post('portone-webhook')
  async webhook(
    @Headers() headers: Record<string, string>,
    @Req() req: RawBodyRequest<Request>,
  ) {
    await this.paymentService.webhook(req.rawBody, headers);
  }
}
