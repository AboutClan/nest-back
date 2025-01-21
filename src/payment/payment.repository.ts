import { Injectable } from '@nestjs/common';
import { PaymentRepositoryInterface } from './payment.repository.interface';

@Injectable()
export class PaymentRepository implements PaymentRepositoryInterface {
  constructor() {}
}
