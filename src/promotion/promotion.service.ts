import { JWT } from 'next-auth/jwt';
import dayjs from 'dayjs';
import { PromotionZodSchema } from './entity/promotion.entity';
import { Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { IPROMOTION_REPOSITORY, IUSER_SERVICE } from 'src/utils/di.tokens';
import { IUserService } from 'src/user/userService.interface';
import { IPromotionService } from './promotionService.interface';
import { PromotionRepository } from './promotion.repository';

export default class PromotionService implements IPromotionService {
  private token: JWT;
  constructor(
    @Inject(IPROMOTION_REPOSITORY)
    private readonly promotionRepository: PromotionRepository,
    @Inject(IUSER_SERVICE) private userServiceInstance: IUserService,
    @Inject(REQUEST) private readonly request: Request, // Request 객체 주입
  ) {
    this.token = this.request.decodedToken;
  }

  async getPromotion() {
    const promotionData = await this.promotionRepository.findAll();
    return promotionData;
  }

  async setPromotion(name: string) {
    try {
      const previousData = await this.promotionRepository.findByName(name);
      const now = dayjs().format('YYYY-MM-DD');

      const validatedPromotion = PromotionZodSchema.parse({
        name,
        uid: this.token.uid,
        lastDate: now,
      });

      if (previousData) {
        const dayDiff = dayjs(now).diff(dayjs(previousData?.lastDate), 'day');
        if (dayDiff > 2) {
          await this.promotionRepository.updatePromotion(
            name,
            validatedPromotion,
          );

          await this.userServiceInstance.updatePoint(100, '홍보 이벤트 참여');
        }
      } else {
        await this.promotionRepository.createPromotion(validatedPromotion);
        await this.userServiceInstance.updatePoint(300, '홍보 이벤트 참여');
      }
    } catch (err: any) {
      throw new Error(err);
    }
  }
}
