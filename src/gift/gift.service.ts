import { JWT } from 'next-auth/jwt';
import { Inject, Injectable } from '@nestjs/common';
import { StoreZodSchema } from './gift.entity';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { IGIFT_REPOSITORY } from 'src/utils/di.tokens';
import { GiftRepository } from './gift.repository.interface';

@Injectable()
export class GiftService {
  private token: JWT;
  constructor(
    @Inject(IGIFT_REPOSITORY)
    private readonly giftRepository: GiftRepository,
    @Inject(REQUEST) private readonly request: Request, // Request 객체 주입
  ) {
    this.token = this.request.decodedToken;
  }

  async getAllGift() {
    const giftUsers = await this.giftRepository.findAllSort();

    return giftUsers;
  }

  async getGift(id: number) {
    const giftUser = await this.giftRepository.findById(id);

    return giftUser;
  }

  async setGift(name: any, cnt: any, giftId: any) {
    const { uid } = this.token;
    const existingUser = await this.giftRepository.findByUidGiftId(uid, giftId);
    if (existingUser) {
      const validatedGift = StoreZodSchema.parse({
        name,
        uid,
        cnt: existingUser.cnt + cnt,
        giftId,
      });

      const user = await this.giftRepository.updateGift(
        this.token.uid,
        validatedGift,
      );
      if (!user) {
        throw new Error('no user');
      }

      return user;
    }

    const newUser = await this.giftRepository.createGift({
      name,
      uid,
      cnt,
      giftId,
    });
    return newUser;
  }
}
