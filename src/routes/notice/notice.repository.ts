import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { INotice } from './notice.entity';
import { NoticeRepository } from './notice.repository.interface';

export class MongoNoticeRepository implements NoticeRepository {
  constructor(
    @InjectModel(DB_SCHEMA.NOTICE)
    private readonly Notice: Model<INotice>,
  ) {}
  async findActiveLog(uid: string): Promise<INotice[]> {
    const types = ['like', 'friend', 'alphabet'];

    const docs = await this.Notice.aggregate([
      { $match: { to: uid, type: { $in: types } } },
      {
        $lookup: {
          from: 'users', // 콜렉션 이름(소문자 복수형일 가능성 높음)
          localField: 'from', // Notice.from (예: 'abc123')
          foreignField: 'uid', // User.uid
          as: 'fromUser',
          pipeline: [
            { $project: { _id: 1, profileImage: 1, avatar: 1 } }, // 필요한 필드만 남기기
          ],
        },
      },
      { $unwind: { path: '$fromUser', preserveNullAndEmptyArrays: true } },
      { $project: { __v: 0 } }, // 필요시 '_id'도 제외 가능
    ]);

    return docs;
    // return await this.Notice.find(
    //   {
    //     to: uid,
    //     $or: [{ type: 'like' }, { type: 'friend' }, { type: 'alphabet' }],
    //   },
    //   '-_id -__v',
    // );
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

  async findTemperatureByPeriod(start: Date, end: Date) {
    return await this.Notice.find(
      { type: 'temperature', createdAt: { $gt: start, $lte: end } },
      '-_id -__v',
    );
  }

  async findMyTemperature(toUid: string) {
    const base = { to: toUid, type: 'temperature' };

    const [totalCnt, greatCnt, goodCnt, reviewArr] = await Promise.all([
      this.Notice.countDocuments({ ...base }),
      this.Notice.countDocuments({ ...base, sub: 'great' }),
      this.Notice.countDocuments({ ...base, sub: 'good' }),
      this.Notice.find({
        ...base,
        sub: { $in: ['great', 'good'] },
        message: { $exists: true, $ne: '' },
      })
        .sort({ createdAt: -1 })
        .limit(3)
        .select('-_id -__v') // 혹은 필요한 필드만 명시적으로
        .lean(),
    ]);

    return { reviewArr, totalCnt, greatCnt, goodCnt };
  }

  async findAllTemperature(page: number = 1, uid: string) {
    const offset = 20;

    return await this.Notice.find(
      {
        toUid: uid,
        type: 'temperature',
        message: { $exists: true },
      },
      '-_id -__v',
    )
      .sort({ createdAt: -1 })
      .skip(offset * (page - 1))
      .limit(offset);
  }
}
