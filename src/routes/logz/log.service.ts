import { Inject } from '@nestjs/common';
import { RequestContext } from 'src/request-context';
import { ILOG_REPOSITORY } from 'src/utils/di.tokens';
import { LogRepository } from './log.repository.interface';

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
    const logs = await this.logRepository.findByUidType(
      '3953423614',
      '67cbf29000886856ca16bcd3',
      type,
    );
    return logs;
  }

  async getTotalPointLog() {
    const token = RequestContext.getDecodedToken();
    const logs = await this.logRepository.findByUidType(
      token.uid,
      token.id,
      'point',
    );

    const total = logs.filter((log) => log?.meta?.value > 0);
    // .reduce((acc, log) => acc + (log?.meta?.value || 0), 0);

    return total;
  }

  async getCuoponLog(type: string, scope?: 'all') {
    const token = RequestContext.getDecodedToken();

    if (!scope) {
      const log = await this.logRepository.findByUidAndSubType(
        token.uid,
        type,
        'coupon',
      );
      return log;
    } else {
      const logs = await this.logRepository.findAllByType(type, null, 'coupon');
      return logs;
    }
  }

  async getAllLog(type: string, scope?: 'month') {
    const logs = await this.logRepository.findAllByType(type, scope);
    return logs;
  }

  async getTicketLog(category: string) {
    const token = RequestContext.getDecodedToken();
    let logs;
    switch (category) {
      case 'gather':
        logs = await this.logRepository.findTicketLog(token.uid, ['gather']);

        break;
      case 'groupStudy':
        logs = await this.logRepository.findTicketLog(token.uid, [
          'groupOffline',
          'groupOnline',
        ]);
        break;
      default:
    }

    return logs;
  }
}
