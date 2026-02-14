import { Realtime } from "../domain/Realtime/Realtime";


export interface IRealtimeRepository {
  findByDate(date, isPopulate: boolean): Promise<Realtime | null>;
  save(entity: Realtime): Promise<Realtime>;
  create(entity: Realtime): Promise<Realtime>;
  patchRealtime(userId: string, updateFields: any, date: string);
  updateStatusWithIdArr(date: string, userIds: string[]);
  findAllUserIdsAfterDate(date: string): Promise<string[]>;
}
