import { Controller, Post } from '@nestjs/common';

@Controller('payment')
export class PaymentController {
  constructor() {}

  @Post('complete')
  async complete() {}
}
