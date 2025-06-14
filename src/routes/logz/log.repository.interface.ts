import { ILog } from './log.entity';

export interface LogRepository {
  findScoreTimestamp(
    uid: string,
    startOfMonth: Date,
    endOfMonth: Date,
  ): Promise<ILog[]>;
  findByUidType(uid: string, type: string): Promise<ILog[]>;
  findByUidAndSubType(uid: string, type: string, sub: string): Promise<ILog[]>;
  findAllByType(type: string, scope?: 'month'): Promise<ILog[]>;
  findTicketLog(userId: String, type: string[]): Promise<ILog[]>;
}
