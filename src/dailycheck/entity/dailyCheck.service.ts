import { JWT } from 'next-auth/jwt';
import { IDailyCheckService } from './dailyCheck.service.interface';
import { InjectModel } from '@nestjs/mongoose';
import { Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { DailyCheckZodSchema, IDailyCheck } from './dailycheck.entity';
import { Model } from 'mongoose';
import dayjs from 'dayjs';

export class DailyCheckService implements IDailyCheckService {
  private token: JWT;
  constructor(
    @InjectModel('DailyCheck') private DailyCheck: Model<IDailyCheck>,
    @Inject(REQUEST) private readonly request: Request, // Request 객체 주입
  ) {
    this.token = this.request.decodedToken;
  }

  async setDailyCheck() {
    const findDailyCheck = await this.DailyCheck.findOne({
      uid: this.token.uid,
    }).sort({ updatedAt: -1 });

    if (findDailyCheck?.updatedAt) {
      if (dayjs().isSame(dayjs(findDailyCheck?.updatedAt), 'date')) {
        return '이미 출석체크를 완료했습니다.';
      }
    }

    const validatedDailyCheck = DailyCheckZodSchema.parse({
      uid: this.token.uid,
      name: this.token.name,
    });

    await this.DailyCheck.create(validatedDailyCheck);

    return;
  }

  async getLog() {
    const result = await this.DailyCheck.find(
      { uid: this.token.uid },
      '-_id -__v',
    );
    return result;
  }
  async getAllLog() {
    const result = await this.DailyCheck.find({}, '-_id -__v');
    return result;
  }
}
