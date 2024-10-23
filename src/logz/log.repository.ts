import { InjectModel } from '@nestjs/mongoose';
import { LogRepository } from './log.repository.interface';
import { ILog } from './entity/log.entity';
import { Model } from 'mongoose';

export class MongoLogRepository implements LogRepository {
  constructor(
    @InjectModel('Log')
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
  async findAllByType(type: string): Promise<ILog[]> {
    return await this.Log.find(
      { 'meta.type': type },
      '-_id timestamp message meta',
    );
  }
}
