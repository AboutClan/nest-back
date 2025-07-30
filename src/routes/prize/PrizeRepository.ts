import { InjectModel } from '@nestjs/mongoose';
import { IPrizeRepository } from './PrizeRepository.interface';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { Model } from 'mongoose';
import { IPrize } from './prize.entity';

export class PrizeRepository implements IPrizeRepository {
  constructor(
    @InjectModel(DB_SCHEMA.PRIZE)
    private readonly Prize: Model<IPrize>,
  ) {}

  async recordPrize(
    userId: string,
    prize: string,
    date: Date,
    category: string,
  ) {}

  async findPrizes(category: string, cursor: number): Promise<IPrize[]> {
    const offset = 20 * (cursor - 1);

    const findQuery: any = {};
    if (category) findQuery.category = category;

    return await this.Prize.find(findQuery)
      .skip(offset)
      .limit(20)
      .sort({ date: -1 });
  }
}
