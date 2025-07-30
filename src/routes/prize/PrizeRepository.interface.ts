import { IPrize } from './prize.entity';

export interface IPrizeRepository {
  recordPrize(userId: string, prize: string, date: Date, category: string);
  findPrizes(cateogry: string, cursor: number): Promise<IPrize[]>;
}
