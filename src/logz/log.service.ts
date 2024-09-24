import { InjectModel } from '@nestjs/mongoose';
import { JWT } from 'next-auth/jwt';
import { ILog, Log } from './entity/log.entity';
import { Model } from 'mongoose';

export default class LogService {
  private token: JWT;
  constructor(
    @InjectModel('Log') private Log: Model<ILog>,
    token?: JWT,
  ) {
    this.token = token as JWT;
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
    const logs = await this.Log.find(
      {
        'meta.type': 'score',
        'meta.uid': this.token.uid,
        timestamp: {
          $gte: startOfMonth,
          $lte: endOfMonth,
        },
      },
      '-_id timestamp message meta',
    )
      .sort({ timestamp: -1 })
      .limit(30);
    return logs;
  }

  async getLog(type: string) {
    const logs = await this.Log.find(
      {
        'meta.uid': this.token.uid,
        'meta.type': type,
      },
      '-_id timestamp message meta',
    )
      .sort({ timestamp: -1 })
      .limit(30);
    return logs;
  }

  async getAllLog(type: string) {
    const logs = await this.Log.find(
      { 'meta.type': type },
      '-_id timestamp message meta',
    );

    return logs;
  }
}
