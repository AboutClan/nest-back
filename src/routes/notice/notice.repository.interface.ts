import { INotice } from './notice.entity';

export interface NoticeRepository {
  findActiveLog(uid: string): Promise<INotice[]>;
  createNotice(noticeData: Partial<INotice>): Promise<INotice>;
  findLike(uid: string): Promise<INotice[]>;
  findLikeAll(): Promise<INotice[]>;
  findFriend(uid: string): Promise<INotice[]>;
  updateRecentStatus(
    toUid: string,
    fromUid: string,
    type: string,
    status: string,
  ): Promise<INotice>;
  findTemperature(uid: string): Promise<INotice[]>;
  findTemperatureByPeriod(start: Date, end: Date): Promise<INotice[]>;
}
