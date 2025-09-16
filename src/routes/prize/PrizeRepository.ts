import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { IPrize } from './prize.entity';
import { IPrizeRepository } from './PrizeRepository.interface';

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
    description?: string,
  ) {
    await this.Prize.create({
      winner: userId,
      gift: prize,
      date,
      category,
      description,
    });
  }

  async findPrizes(category: string, cursor: number): Promise<IPrize[]> {
    const offset = 20 * cursor;

    const findQuery: any = {};
    if (category) findQuery.category = category;

    const a = await this.Prize.find(findQuery)
      .sort({ date: -1 })
      .skip(offset)
      .limit(20)
      .populate('winner', '_id uid name avatar profileImage');
    return a;
  }
}
