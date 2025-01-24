import { Body, Controller, Headers, Inject, Post } from '@nestjs/common';
import { PaymentService } from './payment.service';

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

  @Post('portone-webhook')
  async webhook(@Body() body: any, @Headers() headers: Record<string, string>) {
    try {
      await this.paymentService.webhook(body, headers);
    } catch (err: any) {
      console.log(err);
    }
  }
}
