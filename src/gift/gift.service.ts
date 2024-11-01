import { JWT } from 'next-auth/jwt';
import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IStoreApplicant, StoreZodSchema } from './entity/gift.entity';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { IGiftService } from './giftService.interface';

@Injectable()
export class GiftService implements IGiftService {
  private token: JWT;
  constructor(
    @InjectModel('GiftModel') private Gift: Model<IStoreApplicant>,
    @Inject(REQUEST) private readonly request: Request, // Request 객체 주입
  ) {
    this.token = this.request.decodedToken;
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
