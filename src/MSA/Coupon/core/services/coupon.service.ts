import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { RequestContext } from 'src/request-context';
import { ICOUPON_REPOSITORY } from 'src/utils/di.tokens';
import { ICouponRepository } from '../interfaces/CouponRepository.interface';

@Injectable()
export class CouponService {
  constructor(
    @Inject(ICOUPON_REPOSITORY)
    private readonly couponRepository: ICouponRepository,
  ) { }

  async register(partnerId: string, quantity: number, name?: string) {
    const coupon = await this.couponRepository.createCoupon({
      partnerId,
      name,
      quantity,
    });

    return {
      couponId: coupon._id.toString(),
      partnerId: coupon.partnerId,
      name: coupon.name,
      totalCount: coupon.totalCount,
      remainingCount: coupon.remainingCount,
    };
  }

  async getCoupon(couponId: string) {
    const coupon = await this.couponRepository.findById(couponId);
    if (!coupon) {
      throw new HttpException('쿠폰을 찾을 수 없습니다.', HttpStatus.NOT_FOUND);
    }
    return {
      couponId: coupon._id.toString(),
      partnerId: coupon.partnerId,
      name: coupon.name,
      totalCount: coupon.totalCount,
      remainingCount: coupon.remainingCount,
    };
  }

  async issue(couponId: string) {
    const token = RequestContext.getDecodedToken();
    if (!token?.uid) {
      throw new HttpException('인증이 필요합니다.', HttpStatus.UNAUTHORIZED);
    }
    const { uid: userId } = token;

    const coupon = await this.couponRepository.findById(couponId);
    if (!coupon) {
      throw new HttpException('쿠폰을 찾을 수 없습니다.', HttpStatus.NOT_FOUND);
    }

    const existing = await this.couponRepository.findIssued(couponId, userId);
    if (existing) {
      return this.toIssueResponse({
        couponId: existing.couponId.toString(),
        userId: existing.userId,
        issuedAt: existing.issuedAt,
      });
    }

    const claimed = await this.couponRepository.claimRemaining(couponId);
    if (!claimed) {
      const issued = await this.couponRepository.findIssued(couponId, userId);
      if (issued) return this.toIssueResponse({
        couponId: issued.couponId.toString(),
        userId: issued.userId,
        issuedAt: issued.issuedAt,
      });
      throw new HttpException(
        '쿠폰이 모두 소진되었습니다.',
        HttpStatus.CONFLICT,
      );
    }

    try {
      const issue = await this.couponRepository.createIssue(couponId, userId);
      return this.toIssueResponse({
        couponId: issue.couponId.toString(),
        userId: issue.userId,
        issuedAt: issue.issuedAt,
      });
    } catch (error) {
      // 동일 유저 동시 요청 → 수량 복구 후 기존 발급분 반환
      if ((error as any)?.code === 11000) {
        await this.couponRepository.restoreRemaining(couponId);
        const issued = await this.couponRepository.findIssued(couponId, userId);
        if (issued) return this.toIssueResponse({
          couponId: issued.couponId.toString(),
          userId: issued.userId,
          issuedAt: issued.issuedAt,
        });
      }
      await this.couponRepository.restoreRemaining(couponId);
      throw error;
    }
  }

  async getMine(couponId: string) {
    const token = RequestContext.getDecodedToken();
    if (!token?.uid) {
      throw new HttpException('인증이 필요합니다.', HttpStatus.UNAUTHORIZED);
    }

    const issued = await this.couponRepository.findIssued(couponId, token.uid);
    if (!issued) {
      throw new HttpException(
        '발급받은 쿠폰이 없습니다.',
        HttpStatus.NOT_FOUND,
      );
    }
    return this.toIssueResponse({
      couponId: issued.couponId.toString(),
      userId: issued.userId,
      issuedAt: issued.issuedAt,
    });
  }

  private toIssueResponse(issue: {
    couponId: { toString(): string } | string;
    userId: string;
    issuedAt: Date;
  }) {
    return {
      couponId: issue.couponId.toString(),
      userId: issue.userId,
      issuedAt: issue.issuedAt,
    };
  }
}
