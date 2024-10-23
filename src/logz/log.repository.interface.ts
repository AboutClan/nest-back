import { ILog } from './entity/log.entity';

export interface LogRepository {
  findScoreTimestamp(
    uid: string,
    startOfMonth: Date,
    endOfMonth: Date,
  ): Promise<ILog[]>;
  findByUidType(uid: string, type: string): Promise<ILog[]>;
  findAllByType(type: string): Promise<ILog[]>;
}
