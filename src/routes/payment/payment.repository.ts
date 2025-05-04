import { Injectable } from '@nestjs/common';
import { PaymentRepositoryInterface } from './payment.repository.interface';
import { IPayment } from './payment.entity';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class PaymentRepository implements PaymentRepositoryInterface {
  constructor(
    @InjectModel('Payment')
    private readonly Payment: Model<IPayment>,
  ) {}

  async createPayment(paymentInfo: IPayment) {
    await this.Payment.create(paymentInfo);
    return null;
  }

  async findByPaymentId(paymentId: string) {
    return await this.Payment.findOne({ paymentId });
  }
}
