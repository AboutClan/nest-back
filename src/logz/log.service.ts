import { JWT } from 'next-auth/jwt';
import { Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { ILogService } from './logService.interface';
import { ILOG_REPOSITORY } from 'src/utils/di.tokens';
import { LogRepository } from './log.repository.interface';

export default class LogService implements ILogService {
  private token: JWT;
  constructor(
    @Inject(ILOG_REPOSITORY)
    private readonly logRepository: LogRepository,
    @Inject(REQUEST) private readonly request: Request, // Request 객체 주입
  ) {
    this.token = this.request.decodedToken;
  }

  async getMonthScoreLog() {
    // 현재 날짜를 구합니다.
    const currentDate = new Date();

    // 이번 달의 시작일과 마지막 날을 계산합니다.
    const startOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1,
    );
    const endOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0,
    );
    const logs = await this.logRepository.findScoreTimestamp(
      this.token.uid,
      startOfMonth,
      endOfMonth,
    );
    return logs;
  }

  async getLog(type: string) {
    const logs = await this.logRepository.findByUidType(this.token.uid, type);
    return logs;
  }

  async getAllLog(type: string) {
    const logs = await this.logRepository.findAllByType(type);

    return logs;
  }
}
