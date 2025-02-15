import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ILog } from 'src/logz/log.entity';
import { now } from 'src/vote/util';

export default class AdminLogService {
  constructor(@InjectModel('Log') private Log: Model<ILog>) {}

  async deleteLog(day: number) {
    if (day < 7) return;

    const targetDate = now().subtract(day, 'days').toDate();
    await this.Log.deleteMany({ timestamp: { $lt: targetDate } });
    return;
  }
}
