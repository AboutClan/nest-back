export interface IPrizeRepository {
  recordPrize(userId: string, prize: string, date: Date, category: string);
}
