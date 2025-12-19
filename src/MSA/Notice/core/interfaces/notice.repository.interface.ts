import { INotice } from '../../entity/notice.entity';

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
  findTemperatureByUidArr(uidArr: string[]): Promise<INotice[]>;
  findTemperatureByPeriod(start: Date, end: Date): Promise<INotice[]>;
  findMyTemperature(toUid: string);
  findAllTemperature(page, uid: string);
}
