import { Model } from 'mongoose';
import { IDailyCheck } from '../entity/dailycheck.entity';
import { InjectModel } from '@nestjs/mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { DailyCheckRepository } from '../core/interfaces/dailyCheck.repository.interface';

export class MongoDailyCheckRepository implements DailyCheckRepository {
  constructor(
    @InjectModel(DB_SCHEMA.DAILYCHECK)
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
