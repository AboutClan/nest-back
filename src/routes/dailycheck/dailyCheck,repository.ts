import { Model } from 'mongoose';
import { IDailyCheck } from './dailycheck.entity';
import { DailyCheckRepository } from './dailyCheck.repository.interface';
import { InjectModel } from '@nestjs/mongoose';

export class MongoDailyCheckRepository implements DailyCheckRepository {
  constructor(
    @InjectModel('DailyCheck')
    private readonly DailyCheck: Model<IDailyCheck>,
  ) {}
  async findByUid(uid: string): Promise<IDailyCheck> {
    return await this.DailyCheck.findOne({
      uid,
    }).sort({ updatedAt: -1 });
  }
  async createDailyCheck(
    dailyCheckData: Partial<IDailyCheck>,
  ): Promise<IDailyCheck> {
    return await this.DailyCheck.create(dailyCheckData);
  }
  async findAll(): Promise<IDailyCheck[]> {
    return await this.DailyCheck.find({}, '-_id -__v');
  }
}
