import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IFcmLog } from './fcmLog.entity';
import { FcmLogRepository } from './fcmLog.repository.interface';

export class MongoFcmLogRepository implements FcmLogRepository {
  constructor(
    @InjectModel('FcmLog')
    private readonly FcmLog: Model<IFcmLog>,
  ) {}

  async createLog(data: any): Promise<null> {
    await this.FcmLog.create(data);
    return null;
  }
}
