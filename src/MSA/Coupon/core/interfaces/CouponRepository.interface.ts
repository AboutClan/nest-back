import { Types } from 'mongoose';
import { ICoupon } from '../../entity/coupon.entity';
import { ICouponIssue } from '../../entity/couponIssue.entity';

export interface ICouponRepository {
  createCoupon(params: {
    partnerId: string;
    code: string;
    name?: string;
    quantity: number;
  }): Promise<ICoupon>;

  createCoupons(
    params: {
      partnerId: string;
      code: string;
      name?: string;
      quantity: number;
    }[],
  ): Promise<ICoupon[]>;

  findById(couponId: string): Promise<ICoupon | null>;

  findAll(): Promise<ICoupon[]>;

  findByName(name: string): Promise<ICoupon | null>;

  /** 특정 partnerId에 속한 쿠폰들의 _id 목록 */
  findIdsByPartnerId(partnerId: string): Promise<Types.ObjectId[]>;

  findIssued(couponId: string, userId: string): Promise<ICouponIssue | null>;

  /** couponIds 중 해당 유저가 이미 발급받은 기록 */
  findIssuedAmong(
    couponIds: Types.ObjectId[],
    userId: string,
  ): Promise<ICouponIssue | null>;

  /** remainingCount > 0 일 때만 1 감소. 실패 시 null */
  claimRemaining(couponId: string): Promise<ICoupon | null>;

  /** partnerId 내에서 remainingCount > 0 인 쿠폰 하나를 골라 1 감소. 실패 시 null */
  claimRemainingByPartnerId(partnerId: string): Promise<ICoupon | null>;

  /** 감소분 복구 (동시 발급 충돌 시) */
  restoreRemaining(couponId: string): Promise<void>;

  createIssue(couponId: string, userId: string): Promise<ICouponIssue>;
}
