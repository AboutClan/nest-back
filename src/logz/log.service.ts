import { JWT } from 'next-auth/jwt';
import { Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { ILOG_REPOSITORY } from 'src/utils/di.tokens';
import { LogRepository } from './log.repository.interface';
import { RequestContext } from 'src/request-context';

export default class LogService {
  constructor(
    @Inject(ILOG_REPOSITORY)
    private readonly logRepository: LogRepository,
  ) {}

  async getMonthScoreLog() {
    const token = RequestContext.getDecodedToken();
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
      token.uid,
      startOfMonth,
      endOfMonth,
    );
    return logs;
  }

  async getLog(type: string) {
    const token = RequestContext.getDecodedToken();
    const logs = await this.logRepository.findByUidType(token.uid, type);
    return logs;
  }

  async getAllLog(type: string) {
    const logs = await this.logRepository.findAllByType(type);

    return logs;
  }

  async getTicketLog(category: string) {
    let logs;
    switch (category) {
      case 'gather':
        logs = await this.logRepository.findTicketLog(['gather']);
        break;
      case 'groupStudy':
        logs = await this.logRepository.findTicketLog([
          'groupOffline',
          'groupOnline',
        ]);
        break;
      default:
    }

    return logs;
  }
}
