import { Inject, Injectable } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { JWT } from 'next-auth/jwt';
import { AppError } from 'src/errors/AppError';
import * as PortOne from '@portone/server-sdk';

@Injectable()
export class PaymentService {
  private token: JWT;
  // private portone: PortOne.PortOneClient;

  constructor(
    @Inject(REQUEST) private readonly request: Request, // Request 객체 주입
  ) {
    this.token = this.request.decodedToken;
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
        if (payment.status === 'PAID') console.log('success');
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
    console.log(body, headers);
    try {
      try {
        const webhook = await PortOne.Webhook.verify(
          process.env.PORTONE_WEBHOOK_SECRET,
          body,
          headers,
        );

        console.log('hihi', webhook.type);
        if (!PortOne.Webhook.isUnrecognizedWebhook(webhook)) {
        }
      } catch (err) {
        console.log(err);
        throw new AppError('webhook failed', 400);
      }
    } catch (err) {
      console.log(err);
      throw new AppError('webhook failed', 400);
    }
  }
}
