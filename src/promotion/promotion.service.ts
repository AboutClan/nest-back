import { JWT } from 'next-auth/jwt';
import { Promotion, PromotionZodSchema } from '../db/models/promotion';
import dayjs from 'dayjs';
import UserService from './userService';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IPromotion } from './entity/promotion.entity';

export default class PromotionService {
  private token: JWT;
  constructor(
    @InjectModel('Promotion') private Promotion: Model<IPromotion>,
    token?: JWT,
  ) {
    this.token = token as JWT;
  }

  async getPromotion() {
    const promotionData = await Promotion.find({}, '-_id -__v');
    return promotionData;
  }

  async setPromotion(name: string) {
    const userService: UserService = new UserService(this.token);

    try {
      const previousData = await Promotion.findOne({ name });
      const now = dayjs().format('YYYY-MM-DD');

      const validatedPromotion = PromotionZodSchema.parse({
        name,
        uid: this.token.uid,
        lastDate: now,
      });

      if (previousData) {
        const dayDiff = dayjs(now).diff(dayjs(previousData?.lastDate), 'day');
        if (dayDiff > 2) {
          await Promotion.updateOne({ name }, validatedPromotion);

          await userService.updatePoint(100, '홍보 이벤트 참여');
        }
      } else {
        await Promotion.create(validatedPromotion);
        await userService.updatePoint(300, '홍보 이벤트 참여');
      }
    } catch (err: any) {
      throw new Error(err);
    }
  }
}
