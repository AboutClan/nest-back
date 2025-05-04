import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { ILog } from 'src/routes/logz/log.entity';
import { now } from 'src/vote/util';

export default class AdminLogService {
  constructor(@InjectModel(DB_SCHEMA.LOG) private Log: Model<ILog>) {}

  async deleteLog(day: number) {
    if (day < 7) return;

    const targetDate = now().subtract(day, 'days').toDate();
    await this.Log.deleteMany({ timestamp: { $lt: targetDate } });
    return;
  }
}
