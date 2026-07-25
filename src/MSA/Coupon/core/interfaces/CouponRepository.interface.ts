import { ICoupon } from '../../entity/coupon.entity';
import { ICouponIssue } from '../../entity/couponIssue.entity';

export interface ICouponRepository {
  createCoupon(params: {
    partnerId: string;
    name?: string;
    quantity: number;
  }): Promise<ICoupon>;

  findById(couponId: string): Promise<ICoupon | null>;

  findIssued(couponId: string, userId: string): Promise<ICouponIssue | null>;

  /** remainingCount > 0 일 때만 1 감소. 실패 시 null */
  claimRemaining(couponId: string): Promise<ICoupon | null>;

  /** 감소분 복구 (동시 발급 충돌 시) */
  restoreRemaining(couponId: string): Promise<void>;

  createIssue(couponId: string, userId: string): Promise<ICouponIssue>;
}
