import { JWT } from 'next-auth/jwt';
import { GiftModel, StoreZodSchema } from '../db/models/gift';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IStoreApplicant } from './entity/gift.entity';

@Injectable()
export class GiftService {
  private token: JWT;
  constructor(
    @InjectModel('Gift') private Gift: Model<IStoreApplicant>,
    token?: JWT,
  ) {
    this.token = token as JWT;
  }

  async getAllGift() {
    const giftUsers = await GiftModel.find({})
      .sort('createdAt')
      .select('-_id -createdAt -updatedAt -__v');

    return giftUsers;
  }

  async getGift(id: number) {
    const giftUser = await GiftModel.find({ giftId: id }).select(
      '-_id -createdAt -updatedAt -__v',
    );

    return giftUser;
  }

  async setGift(name: any, cnt: any, giftId: any) {
    const { uid } = this.token;
    const existingUser = await GiftModel.findOne({
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

      const user = await GiftModel.findOneAndUpdate(
        { uid: this.token.uid },
        validatedGift,
        { new: true, runValidators: true },
      );
      if (!user) {
        throw new Error('no user');
      }

      return user;
    }

    const newUser = await GiftModel.create({ name, uid, cnt, giftId });
    return newUser;
  }
}
