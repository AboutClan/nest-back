import { PRIZE } from 'src/Constants/PRIZE';
import { IPrizeRepository } from './PrizeRepository.interface';
import { Inject } from '@nestjs/common';
import { IPRIZE_REPOSITORY } from 'src/utils/di.tokens';

export class PrizeService {
  prizeList = PRIZE;
  constructor(
    @Inject(IPRIZE_REPOSITORY)
    private readonly PrizeRepository: IPrizeRepository,
  ) {
    this.prizeList = PRIZE;
  }

  async recordMonthPrize(tier: string, userIds: string) {
    const prize = this.prizeList[tier];

    for (let i = 0; i < prize.length; i++) {
      const userId = userIds[i];
      const date = new Date();
      const category = 'ranking';
      const description = `월간 ${tier} 상위 ${i + 1}등 상품`;

      if (userId) {
        this.PrizeRepository.recordPrize(
          userId,
          prize[i],
          date,
          category,
          description,
        );
      }
    }
  }

  async getPrizeList(category: string, cursor: string) {
    const cursorNumber = parseInt(cursor, 10) || 1;

    return this.PrizeRepository.findPrizes(category, cursorNumber);
  }
}
