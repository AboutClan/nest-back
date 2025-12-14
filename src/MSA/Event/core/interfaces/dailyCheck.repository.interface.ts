import { IDailyCheck } from '../../entity/dailycheck.entity';

export interface DailyCheckRepository {
  findByUid(uid: string): Promise<IDailyCheck>;
  createDailyCheck(dailyCheckData: Partial<IDailyCheck>): Promise<IDailyCheck>;
  findAll(): Promise<IDailyCheck[]>;
}
