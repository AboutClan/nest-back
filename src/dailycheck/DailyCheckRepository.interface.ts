import { DailyCheck } from 'src/domain/entities/DailyCheck';

export interface IDailyCheckRepository {
  findByUid(uid: string): Promise<DailyCheck>;
  create(dailyCheckData: DailyCheck): Promise<DailyCheck>;
  findAll(): Promise<DailyCheck[]>;
}
