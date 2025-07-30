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
}
