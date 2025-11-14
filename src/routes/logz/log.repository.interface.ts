import { ILog } from './log.entity';

export interface LogRepository {
  findScoreTimestamp(
    uid: string,
    startOfMonth: Date,
    endOfMonth: Date,
  ): Promise<ILog[]>;
  findByUidType(uid: string, userId: string, type: string): Promise<ILog[]>;
  findByUidAndSubType(uid: string, type: string, sub: string): Promise<ILog[]>;
  findAllByType(type: string, scope?: 'month', sub?: 'coupon'): Promise<ILog[]>;
  findTicketLog(userId: String, type: string[]): Promise<ILog[]>;
}
