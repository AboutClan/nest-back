import { Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import dayjs from 'dayjs';
import { Request } from 'express';
import { JWT } from 'next-auth/jwt';
import { IPROMOTION_REPOSITORY, IUSER_SERVICE } from 'src/utils/di.tokens';
import { PromotionZodSchema } from './promotion.entity';
import { PromotionRepository } from './promotion.repository';
import {
  PROMOTION_EVENT_DOUBLE_POINT,
  PROMOTION_EVENT_POINT,
} from 'src/Constants/point';
import { UserService } from 'src/user/user.service';
import { RequestContext } from 'src/request-context';

export default class PromotionService {
  constructor(
    @Inject(IPROMOTION_REPOSITORY)
    private readonly promotionRepository: PromotionRepository,
    private readonly userServiceInstance: UserService,
  ) {}

  async getPromotion() {
    const promotionData = await this.promotionRepository.findAll();
    return promotionData;
  }

  async setPromotion(name: string) {
    const token = RequestContext.getDecodedToken();

    try {
      const previousData = await this.promotionRepository.findByName(name);
      const now = dayjs().format('YYYY-MM-DD');

      const validatedPromotion = PromotionZodSchema.parse({
        name,
        uid: token.uid,
        lastDate: now,
      });

      if (previousData) {
        const dayDiff = dayjs(now).diff(dayjs(previousData?.lastDate), 'day');
        if (dayDiff > 2) {
          await this.promotionRepository.updatePromotion(
            name,
            validatedPromotion,
          );

          await this.userServiceInstance.updatePoint(
            PROMOTION_EVENT_POINT,
            '홍보 이벤트 참여',
          );
        }
      } else {
        await this.promotionRepository.createPromotion(validatedPromotion);
        await this.userServiceInstance.updatePoint(
          PROMOTION_EVENT_DOUBLE_POINT,
          '홍보 이벤트 참여',
        );
      }
    } catch (err: any) {
      throw new Error(err);
    }
  }
}
