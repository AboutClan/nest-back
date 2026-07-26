import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { RequestContext } from 'src/request-context';
import { ICOUPON_REPOSITORY } from 'src/utils/di.tokens';
import { ICoupon } from '../../entity/coupon.entity';
import { ICouponIssue } from '../../entity/couponIssue.entity';
import { ICouponRepository } from '../interfaces/CouponRepository.interface';

@Injectable()
export class CouponService {
  constructor(
    @Inject(ICOUPON_REPOSITORY)
    private readonly couponRepository: ICouponRepository,
  ) {}

  async register(
    partnerId: string,
    code: string,
    quantity: number,
    name?: string,
  ) {
    const coupon = await this.couponRepository.createCoupon({
      partnerId,
      code,
      name,
      quantity,
    });

    return this.toCouponResponse(coupon);
  }

  /** 파트너의 쿠폰 코드를 한 번에 등록 (코드별 quantity=1) */
  async registerBulk(partnerId: string, codes: string[], name?: string) {
    const coupons = await this.couponRepository.createCoupons(
      codes.map((code) => ({
        partnerId,
        code,
        name,
        quantity: 1,
      })),
    );

    return coupons.map((coupon) => this.toCouponResponse(coupon));
  }

  async getCoupon(couponId: string) {
    const coupon = await this.couponRepository.findById(couponId);
    if (!coupon) {
      throw new HttpException('쿠폰을 찾을 수 없습니다.', HttpStatus.NOT_FOUND);
    }
    return this.toCouponResponse(coupon);
  }

  async getAll() {
    const coupons = await this.couponRepository.findAll();
    return coupons.map((coupon) => this.toCouponResponse(coupon));
  }

  async getByName(name: string) {
    const coupon = await this.couponRepository.findByName(name);
    if (!coupon) {
      throw new HttpException('쿠폰을 찾을 수 없습니다.', HttpStatus.NOT_FOUND);
    }
    return this.toCouponResponse(coupon);
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
      return this.toIssueResponse(existing, coupon);
    }

    const claimed = await this.couponRepository.claimRemaining(couponId);
    if (!claimed) {
      const issued = await this.couponRepository.findIssued(couponId, userId);
      if (issued) return this.toIssueResponse(issued, coupon);
      throw new HttpException(
        '쿠폰이 모두 소진되었습니다.',
        HttpStatus.CONFLICT,
      );
    }

    try {
      const issue = await this.couponRepository.createIssue(couponId, userId);
      return this.toIssueResponse(issue, claimed);
    } catch (error) {
      // 동일 유저 동시 요청 → 수량 복구 후 기존 발급분 반환
      if ((error as any)?.code === 11000) {
        await this.couponRepository.restoreRemaining(couponId);
        const issued = await this.couponRepository.findIssued(couponId, userId);
        if (issued) return this.toIssueResponse(issued, claimed);
      }
      await this.couponRepository.restoreRemaining(couponId);
      throw error;
    }
  }

  /**
   * partnerId로 발급: 이미 해당 partnerId 소속 쿠폰을 발급받은 기록이 있으면
   * 그 코드를 그대로 반환하고, 없으면 잔여 코드 중 하나를 새로 배정한다.
   */
  async issueByPartner(partnerId: string) {
    const token = RequestContext.getDecodedToken();
    if (!token?.uid) {
      throw new HttpException('인증이 필요합니다.', HttpStatus.UNAUTHORIZED);
    }
    console.log(token);
    const { id: userId } = token;

    const couponIds = await this.couponRepository.findIdsByPartnerId(partnerId);
    if (!couponIds.length) {
      throw new HttpException('쿠폰을 찾을 수 없습니다.', HttpStatus.NOT_FOUND);
    }

    const existing = await this.couponRepository.findIssuedAmong(
      couponIds,
      userId,
    );
    if (existing) {
      const coupon = await this.couponRepository.findById(
        existing.couponId.toString(),
      );
      return this.toIssueResponse(existing, coupon);
    }

    const claimed =
      await this.couponRepository.claimRemainingByPartnerId(partnerId);
    if (!claimed) {
      const issued = await this.couponRepository.findIssuedAmong(
        couponIds,
        userId,
      );
      if (issued) {
        const coupon = await this.couponRepository.findById(
          issued.couponId.toString(),
        );
        return this.toIssueResponse(issued, coupon);
      }
      throw new HttpException(
        '쿠폰이 모두 소진되었습니다.',
        HttpStatus.CONFLICT,
      );
    }

    const couponId = claimed._id.toString();
    try {
      const issue = await this.couponRepository.createIssue(couponId, userId);
      return this.toIssueResponse(issue, claimed);
    } catch (error) {
      // 동일 유저 동시 요청 → 수량 복구 후 기존 발급분 반환
      if ((error as any)?.code === 11000) {
        await this.couponRepository.restoreRemaining(couponId);
        const issued = await this.couponRepository.findIssuedAmong(
          couponIds,
          userId,
        );
        if (issued) {
          const coupon = await this.couponRepository.findById(
            issued.couponId.toString(),
          );
          return this.toIssueResponse(issued, coupon);
        }
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
    const coupon = await this.couponRepository.findById(couponId);
    return this.toIssueResponse(issued, coupon);
  }

  private toCouponResponse(coupon: ICoupon) {
    return {
      couponId: coupon._id.toString(),
      partnerId: coupon.partnerId,
      code: coupon.code,
      name: coupon.name,
      totalCount: coupon.totalCount,
      remainingCount: coupon.remainingCount,
    };
  }

  private toIssueResponse(issue: ICouponIssue, coupon?: ICoupon | null) {
    return {
      couponId: issue.couponId.toString(),
      userId: issue.userId,
      issuedAt: issue.issuedAt,
      code: coupon?.code,
    };
  }
}
