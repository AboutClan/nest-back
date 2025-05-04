import { InjectModel } from '@nestjs/mongoose';
import { NoticeRepository } from './notice.repository.interface';
import { Model } from 'mongoose';
import { INotice } from './notice.entity';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';

export class MongoNoticeRepository implements NoticeRepository {
  constructor(
    @InjectModel(DB_SCHEMA.NOTICE)
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
  async updateRecentStatus(
    toUid: string,
    fromUid: string,
    type: string,
    status: string,
  ): Promise<INotice> {
    return await this.Notice.findOneAndUpdate(
      { to: toUid, from: fromUid, type },
      { status },
      { sort: { _id: -1 }, new: true },
    );
  }

  async findTemperature(uid: string): Promise<INotice[]> {
    return await this.Notice.find(
      { to: uid, type: 'temperature' },
      '-_id -__v',
    );
  }
}
