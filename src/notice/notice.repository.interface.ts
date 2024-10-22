import { INotice } from './entity/notice.entity';

export interface NoticeRepository {
  findActiveLog(uid: string): Promise<INotice[]>;
  createNotice(noticeData: Partial<INotice>): Promise<INotice>;
  findLike(uid: string): Promise<INotice[]>;
  findLikeAll(): Promise<INotice[]>;
  findFriend(uid: string): Promise<INotice[]>;
  findByToFromType(uid: string, from: string, type: string): Promise<INotice[]>;
}
