import { JWT } from 'next-auth/jwt';
import dayjs from 'dayjs';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IPromotion, PromotionZodSchema } from './entity/promotion.entity';
import { Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { IUSER_SERVICE } from 'src/utils/di.tokens';
import { IUserService } from 'src/user/userService.interface';

export default class PromotionService {
  private token: JWT;
  constructor(
    @InjectModel('Promotion') private Promotion: Model<IPromotion>,
    @Inject(IUSER_SERVICE) private userServiceInstance: IUserService,
    @Inject(REQUEST) private readonly request: Request, // Request 객체 주입
  ) {
    this.token = this.request.decodedToken;
  }

  async getPromotion() {
    const promotionData = await this.Promotion.find({}, '-_id -__v');
    return promotionData;
  }

  async setPromotion(name: string) {
    try {
      const previousData = await this.Promotion.findOne({ name });
      const now = dayjs().format('YYYY-MM-DD');

      const validatedPromotion = PromotionZodSchema.parse({
        name,
        uid: this.token.uid,
        lastDate: now,
      });

      if (previousData) {
        const dayDiff = dayjs(now).diff(dayjs(previousData?.lastDate), 'day');
        if (dayDiff > 2) {
          await this.Promotion.updateOne({ name }, validatedPromotion);

          await this.userServiceInstance.updatePoint(100, '홍보 이벤트 참여');
        }
      } else {
        await this.Promotion.create(validatedPromotion);
        await this.userServiceInstance.updatePoint(300, '홍보 이벤트 참여');
      }
    } catch (err: any) {
      throw new Error(err);
    }
  }
}
