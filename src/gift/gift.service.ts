import { JWT } from 'next-auth/jwt';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  GiftModel,
  IStoreApplicant,
  StoreZodSchema,
} from './entity/gift.entity';
import { RequestContext } from 'src/request-context';

@Injectable()
export class GiftService {
  private token: JWT;
  constructor(
    @InjectModel(GiftModel.name) private Gift: Model<IStoreApplicant>,
  ) {
    this.token = RequestContext.getDecodedToken();
  }

  async getAllGift() {
    const giftUsers = await this.Gift.find({})
      .sort('createdAt')
      .select('-_id -createdAt -updatedAt -__v');

    return giftUsers;
  }

  async getGift(id: number) {
    const giftUser = await this.Gift.find({ giftId: id }).select(
      '-_id -createdAt -updatedAt -__v',
    );

    return giftUser;
  }

  async setGift(name: any, cnt: any, giftId: any) {
    const { uid } = this.token;
    const existingUser = await this.Gift.findOne({
      uid,
      giftId,
    });
    if (existingUser) {
      const validatedGift = StoreZodSchema.parse({
        name,
        uid,
        cnt: existingUser.cnt + cnt,
        giftId,
      });

      const user = await this.Gift.findOneAndUpdate(
        { uid: this.token.uid },
        validatedGift,
        { new: true, runValidators: true },
      );
      if (!user) {
        throw new Error('no user');
      }

      return user;
    }

    const newUser = await this.Gift.create({ name, uid, cnt, giftId });
    return newUser;
  }
}
