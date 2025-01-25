import { Body, Controller, Headers, Inject, Post, Req } from '@nestjs/common';
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
    @Req() req: Request,
  ) {
    try {
      await this.paymentService.webhook(req.body, headers);
    } catch (err: any) {
      console.log(err);
    }
  }
}
