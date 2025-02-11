import { JWT } from 'next-auth/jwt';
import { Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { DailyCheckZodSchema } from './dailycheck.entity';
import { IDAILYCHECK_REPOSITORY } from 'src/utils/di.tokens';
import { DailyCheckRepository } from './dailyCheck.repository.interface';
import { DAILY_ATTEND_POINT } from 'src/Constants/point';
import { UserService } from 'src/user/user.service';

export class DailyCheckService {
  private token: JWT;
  constructor(
    @Inject(IDAILYCHECK_REPOSITORY)
    private readonly dailyCheckRepository: DailyCheckRepository,
    private readonly userService: UserService,
    @Inject(REQUEST) private readonly request: Request, // Request 객체 주입
  ) {
    this.token = this.request.decodedToken;
  }

  async setDailyCheck() {
    const findDailyCheck = await this.dailyCheckRepository.findByUid(
      this.token.uid,
    );

    if (findDailyCheck?.updatedAt) {
      const today = new Date();
      const updatedAt = findDailyCheck?.updatedAt
        ? new Date(findDailyCheck.updatedAt)
        : null;

      if (updatedAt && today.toDateString() === updatedAt.toDateString()) {
        return '이미 출석체크를 완료했습니다.';
      }
    }

    const validatedDailyCheck = DailyCheckZodSchema.parse({
      uid: this.token.uid,
      name: this.token.name,
    });

    await this.dailyCheckRepository.createDailyCheck(validatedDailyCheck);

    await this.userService.updatePoint(DAILY_ATTEND_POINT, '일일 출석');
    return;
  }

  async getLog() {
    return await this.dailyCheckRepository.findByUid(this.token.uid);
  }
  async getAllLog() {
    return await this.dailyCheckRepository.findAll();
  }
}
