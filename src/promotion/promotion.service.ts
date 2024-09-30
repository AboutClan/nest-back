import { JWT } from 'next-auth/jwt';
import dayjs from 'dayjs';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IPromotion, PromotionZodSchema } from './entity/promotion.entity';
import { UserService } from 'src/user/user.service';
import { RequestContext } from 'src/request-context';

export default class PromotionService {
  private token: JWT;
  constructor(
    @InjectModel('Promotion') private Promotion: Model<IPromotion>,
    private readonly userServiceInstance: UserService,
  ) {
    this.token = RequestContext.getDecodedToken();
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
