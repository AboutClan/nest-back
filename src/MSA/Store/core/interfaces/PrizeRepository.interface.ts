import { IPrize } from '../../entity/prize.entity';

export interface IPrizeRepository {
  recordPrize(
    userId: string,
    prize: string,
    date: Date,
    category: string,
    description?: string,
  ): Promise<void>;
  findPrizes(cateogry: string, cursor: number): Promise<IPrize[]>;
}
