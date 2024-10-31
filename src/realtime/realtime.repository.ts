import { IRealtime, IRealtimeUser } from './realtime.entity';

export interface RealtimeRepository {
  findByDate(date: Date): Promise<IRealtime>;
  createByDate(date: Date): Promise<IRealtime>;
  patchUser(date: Date, data: IRealtimeUser): Promise<IRealtime>;
  patchAttendance(
    date: Date,
    data: IRealtimeUser,
    userId: string,
  ): Promise<null>;
  patchRealtime(
    userId: string,
    updateFields: Partial<IRealtimeUser>,
    data: Date,
  );
}