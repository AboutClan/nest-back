import { InjectModel } from '@nestjs/mongoose';
import { NoticeRepository } from './notice.repository.interface';
import { Model } from 'mongoose';
import { INotice } from './entity/notice.entity';

export class MongoNoticeRepository implements NoticeRepository {
  constructor(
    @InjectModel('Notice')
    private readonly Notice: Model<INotice>,
  ) {}
  async findActiveLog(uid: string): Promise<INotice[]> {
    return await this.Notice.find(
      {
        to: uid,
        $or: [{ type: 'like' }, { type: 'friend' }, { type: 'alphabet' }],
      },
      '-_id -__v',
    );
  }
  async createNotice(noticeData: Partial<INotice>): Promise<INotice> {
    return await this.Notice.create(noticeData);
  }
  async findLike(uid: string): Promise<INotice[]> {
    return await this.Notice.find({ to: uid, type: 'like' }, '-_id -__v');
  }
  async findLikeAll(): Promise<INotice[]> {
    return await this.Notice.find({ type: 'like' }, '-_id -__v');
  }
  async findFriend(uid: string): Promise<INotice[]> {
    return await this.Notice.find({ to: uid, type: 'friend' }, '-_id -__v');
  }
  async findByToFromType(
    toUid: string,
    fromUid: string,
    type: string,
  ): Promise<INotice[]> {
    return await this.Notice.find({
      to: toUid,
      from: fromUid,
      type,
    });
  }
}
