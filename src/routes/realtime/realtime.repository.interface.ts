import { IRealtime, IRealtimeUser } from './realtime.entity';

export interface RealtimeRepository {
  findByDate(date: string): Promise<IRealtime>;
  createByDate(date: string): Promise<IRealtime>;
  patchUser(date: string, data: any): Promise<IRealtime>;
  patchAttendance(date: string, data: any, userId: string): Promise<null>;
  patchRealtime(
    userId: string,
    updateFields: Partial<IRealtimeUser>,
    data: string,
  );
}
