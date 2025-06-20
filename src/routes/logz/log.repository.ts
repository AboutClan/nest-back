import { InjectModel } from '@nestjs/mongoose';
import dayjs from 'dayjs';
import { Model } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { ILog } from './log.entity';
import { LogRepository } from './log.repository.interface';

export class MongoLogRepository implements LogRepository {
  constructor(
    @InjectModel(DB_SCHEMA.LOG)
    private readonly Log: Model<ILog>,
  ) {}
  async findScoreTimestamp(
    uid: string,
    startOfMonth: Date,
    endOfMonth: Date,
  ): Promise<ILog[]> {
    return await this.Log.find(
      {
        'meta.type': 'score',
        'meta.uid': uid,
        timestamp: {
          $gte: startOfMonth,
          $lte: endOfMonth,
        },
      },
      '-_id timestamp message meta',
    )
      .sort({ timestamp: -1 })
      .limit(30);
  }
  async findByUidType(uid: string, type: string): Promise<ILog[]> {
    return await this.Log.find(
      {
        'meta.uid': uid,
        'meta.type': type,
      },
      '-_id timestamp message meta',
    )
      .sort({ timestamp: -1 })
      .limit(30);
  }
  async findByUidAndSubType(
    uid: string,
    type: string,
    sub: string,
  ): Promise<ILog[]> {
 
    return await this.Log.findOne(
      {
        'meta.uid': uid,
        'meta.type': type,
        'meta.sub': sub,
      },
      '-_id timestamp message meta',
    );
  }
  async findAllByType(type: string, scope?: 'month'): Promise<ILog[]> {
    const query: any = {
      'meta.type': type,
    };

    if (scope === 'month') {
      const now = new Date();
      const startOfMonthKST = dayjs()
        .startOf('month')
        .subtract(9, 'hour')
        .toDate();
      const nowUTC = dayjs(now).subtract(9, 'hour').toDate();

      query.timestamp = {
        $gte: startOfMonthKST,
        $lte: nowUTC,
      };
    }

    return await this.Log.find(query, '-_id timestamp message meta');
  }
  async findTicketLog(uid: String, type: string[]): Promise<ILog[]> {
    return await this.Log.find(
      { 'meta.type': { $in: type }, 'meta.uid': uid },
      '-_id timestamp message meta',
    );
  }
}
