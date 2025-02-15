import { Inject, Injectable } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { JWT } from 'next-auth/jwt';
import { AppError } from 'src/errors/AppError';
import * as PortOne from '@portone/server-sdk';
import { IPAYMENT_REPOSITORY } from 'src/utils/di.tokens';
import { PaymentRepository } from './payment.repository';
import { DatabaseError } from 'src/errors/DatabaseError';

@Injectable()
export class PaymentService {
  // private portone: PortOne.PortOneClient;

  constructor(
    @Inject(IPAYMENT_REPOSITORY)
    private readonly paymentRepository: PaymentRepository,
  ) {
    // this.portone = PortOne.PortOneClient({
    //   secret: process.env.PORTONE_SECRET,
    // });
  }

  async complete(paymentId: string, order: string) {
    try {
      // 요청의 body로 paymentId가 오기를 기대합니다.

      // 1. 포트원 결제내역 단건조회 API 호출
      const paymentResponse = await fetch(
        `https://api.portone.io/payments/${encodeURIComponent(paymentId)}`,
        {
          headers: { Authorization: `PortOne ${process.env.PORTONE_SECRET}` },
        },
      );

      if (!paymentResponse.ok)
        throw new AppError(
          `paymentResponse: ${await paymentResponse.json()}`,
          500,
        );

      const payment = await paymentResponse.json();

      // 2. 고객사 내부 주문 데이터의 가격과 실제 지불된 금액을 비교합니다.
      //   const orderData = await OrderService.getOrderData(order);
      if (1000 === payment.amount.total) {
        switch (payment.status) {
          case 'PAID':
            await this.paymentRepository.createPayment({
              paymentId,
              amount: payment.amount.total,
            });
            break;
          default:
            break;
        }
      } else {
        throw new AppError('Payment failed', 400);
        // 결제 금액이 불일치하여 위/변조 시도가 의심됩니다.
      }
    } catch (e) {
      // 결제 검증에 실패했습니다.
      throw new AppError('Payment failed', 400);
    }
  }

  async webhook(body: any, headers: Record<string, string>) {
    try {
      const webhook: any = await PortOne.Webhook.verify(
        process.env.PORTONE_WEBHOOK_SECRET,
        body.toString(),
        headers,
      );

      console.log('hey', webhook);

      if (!PortOne.Webhook.isUnrecognizedWebhook(webhook)) {
        const paymentInfo = await this.paymentRepository.findByPaymentId(
          webhook.data.paymentId,
        );
        if (!paymentInfo) throw new DatabaseError("can't find Payment");

        if (paymentInfo.amount == webhook) {
          console.log('success');
        }
      }
    } catch (err) {
      console.log(err);
      throw new AppError('webhook failed', 400);
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
