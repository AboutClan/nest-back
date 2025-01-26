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
    try {
      await this.paymentService.webhook(req.rawBody, headers);
    } catch (err: any) {
      console.log(err);
    }
  }
}

// mingwan {
//   type: 'Transaction.Paid',
//   timestamp: '2025-01-25T08:32:39.043767878Z',
//   data: {
//     transactionId: '01949c97-7483-3f81-6628-6fdac81fe76b',
//     paymentId: 'payment-ecb5f745-06ab-4db2-b9a9-8b6a4f62f58c',
//     storeId: 'store-171c3102-3bde-452a-b06e-2ac955bec56e'
//   }
// }
