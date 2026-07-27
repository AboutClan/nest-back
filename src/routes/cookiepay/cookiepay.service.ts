import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import RegisterService from 'src/MSA/User/core/services/register.service';
import { UserService } from 'src/MSA/User/core/services/user.service';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { ICookiepayOrder } from './cookiepayOrder.entity';

@Injectable()
export class CookiepayService {
  constructor(
    @InjectModel(DB_SCHEMA.COOKIEPAY_ORDER)
    private readonly CookiepayOrder: Model<ICookiepayOrder>,
    private readonly registerService: RegisterService,
    private readonly userService: UserService,
  ) {}

  /** 결제창을 열기 전, orderNo <-> uid <-> type <-> amount를 먼저 저장한다. */
  async createOrder(params: {
    orderNo: string;
    uid: string;
    type: 'register' | 'point';
    amount: number;
    discount?: number;
    referrerUid?: string;
  }) {
    const order = await this.CookiepayOrder.findOneAndUpdate(
      { orderNo: params.orderNo },
      {
        $setOnInsert: {
          orderNo: params.orderNo,
          uid: params.uid,
          type: params.type,
          amount: params.amount,
          discount: params.discount,
          referrerUid: params.referrerUid,
          status: 'PENDING',
          processedAt: null,
        },
      },
      { upsert: true, new: true },
    );
    return order;
  }

  async getOrder(orderNo: string) {
    return this.CookiepayOrder.findOne({ orderNo }).lean();
  }

  /**
   * PG 검증(paycert)을 마친 return/noti가 결과를 알려주는 지점.
   * 여기서 금액을 다시 검증하고, SUCCESS인 경우 바로 finalize까지 시도한다.
   */
  async markResult(params: {
    orderNo: string;
    verifiedAmount: number;
    verifiedStatus: 'SUCCESS' | 'FAIL';
  }) {
    const order = await this.CookiepayOrder.findOne({ orderNo: params.orderNo });
    if (!order) {
      throw new HttpException('알 수 없는 주문입니다.', HttpStatus.NOT_FOUND);
    }

    if (params.verifiedStatus !== 'SUCCESS') {
      if (order.status !== 'SUCCESS') {
        order.status = 'FAIL';
        await order.save();
      }
      return { ok: true, processed: false };
    }

    // 결제 금액 위·변조 방지: PG가 검증해준 실결제 금액과 사전 등록 금액이 같아야만 진행
    if (Math.round(params.verifiedAmount) !== Math.round(order.amount)) {
      if (order.status !== 'SUCCESS') {
        order.status = 'FAIL';
        await order.save();
      }
      throw new HttpException('결제 금액이 일치하지 않습니다.', HttpStatus.CONFLICT);
    }

    if (order.status !== 'SUCCESS') {
      order.status = 'SUCCESS';
      await order.save();
    }

    return this.finalize(params.orderNo);
  }

  /**
   * webhook/return/클라이언트가 중복으로 호출해도 실제 승인/포인트 지급은
   * 정확히 한 번만 실행되도록 하는 원자적 클레임.
   */
  async finalize(orderNo: string) {
    const claimed = await this.CookiepayOrder.findOneAndUpdate(
      { orderNo, status: 'SUCCESS', processedAt: null },
      { $set: { processedAt: new Date() } },
      { new: true },
    );

    if (!claimed) {
      const order = await this.CookiepayOrder.findOne({ orderNo }).lean();
      if (!order) {
        throw new HttpException('알 수 없는 주문입니다.', HttpStatus.NOT_FOUND);
      }
      if (order.status !== 'SUCCESS') {
        return { ok: true, processed: false };
      }
      // status가 SUCCESS인데 클레임에 실패했다면 이미 다른 호출이 처리했음을 의미
      return { ok: true, processed: true, alreadyProcessed: true };
    }

    try {
      if (claimed.type === 'register') {
        await this.registerService.approve(claimed.uid, claimed.referrerUid);
      } else {
        await this.userService.updatePoint(
          claimed.amount,
          '포인트 충전',
          'point',
          claimed.uid,
        );
      }
      return { ok: true, processed: true };
    } catch (err) {
      // 실행 실패 시 재시도가 가능하도록 클레임을 되돌린다.
      await this.CookiepayOrder.updateOne(
        { orderNo },
        { $set: { processedAt: null } },
      );
      throw err;
    }
  }
}
