import { Realtime } from 'src/domain/entities/Realtime/Realtime';

export interface IRealtimeRepository {
  findByDate(date): Promise<Realtime>;
}
