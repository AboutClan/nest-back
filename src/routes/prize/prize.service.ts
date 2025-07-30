import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { PRIZE } from 'src/Constants/PRIZE';
import { IPrizeRepository } from './PrizeRepository.interface';
import { Inject } from '@nestjs/common';
import { IPRIZE_REPOSITORY } from 'src/utils/di.tokens';

export class PrizeService {
  prizeList = null;
  constructor(
    @Inject(IPRIZE_REPOSITORY)
    private readonly PrizeRepository: IPrizeRepository,
  ) {
    this.prizeList = PRIZE;
  }

  async distributeMonthPrize(tier: string, userIds: string) {
    const prize = this.prizeList[tier];

    for (let i = 0; i < prize.length; i++) {
      const userId = userIds[i];
      const date = new Date();
      const category = 'ranking';

      if (userId) {
        this.PrizeRepository.recordPrize(userId, prize[i], date, category);
      }
    }
  }
}
