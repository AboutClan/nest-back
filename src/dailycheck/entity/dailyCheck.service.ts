import { JWT } from 'next-auth/jwt';
import { IDailyCheckService } from './dailyCheck.service.interface';
import { InjectModel } from '@nestjs/mongoose';
import { Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { DailyCheckZodSchema, IDailyCheck } from './dailycheck.entity';
import { Model } from 'mongoose';
import dayjs from 'dayjs';
import { IDAILYCHECK_REPOSITORY } from 'src/utils/di.tokens';
import { DailyCheckRepository } from './dailyCheck.repository.interface';

export class DailyCheckService implements IDailyCheckService {
  private token: JWT;
  constructor(
    @Inject(IDAILYCHECK_REPOSITORY)
    private readonly dailyCheckRepository: DailyCheckRepository,
    @Inject(REQUEST) private readonly request: Request, // Request 객체 주입
  ) {
    this.token = this.request.decodedToken;
  }

  async setDailyCheck() {
    const findDailyCheck = await this.dailyCheckRepository.findByUid(
      this.token.uid,
    );

    if (findDailyCheck?.updatedAt) {
      if (dayjs().isSame(dayjs(findDailyCheck?.updatedAt), 'date')) {
        return '이미 출석체크를 완료했습니다.';
      }
    }

    const validatedDailyCheck = DailyCheckZodSchema.parse({
      uid: this.token.uid,
      name: this.token.name,
    });

    await this.dailyCheckRepository.createDailyCheck(validatedDailyCheck);

    return;
  }

  async getLog() {
    const result = await this.dailyCheckRepository.findByUid(this.token.uid);
    return result;
  }
  async getAllLog() {
    const result = await this.dailyCheckRepository.findAll();
    return result;
  }
}
