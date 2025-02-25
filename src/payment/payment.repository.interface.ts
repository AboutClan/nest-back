import { IPayment } from './payment.entity';

export interface PaymentRepositoryInterface {
  createPayment(paymentInfo: IPayment);
  findByPaymentId(paymentId: string);
}
