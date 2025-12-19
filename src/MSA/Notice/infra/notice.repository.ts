import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { NoticeRepository } from '../core/interfaces/notice.repository.interface';
import { INotice } from '../entity/notice.entity';

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
  async findTemperatureByUidArr(uidArr: string[]): Promise<INotice[]> {
    return await this.Notice.find(
      {
        type: 'temperature',
        to: { $in: uidArr },
        from: { $in: uidArr },
      },
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
    const baseMatch = { to: toUid, type: 'temperature' as const };

    // 1) 같은 from 에서 온 평가 중 가장 최신 것만 남기기
    const latestByFrom = await this.Notice.aggregate([
      { $match: baseMatch },
      { $sort: { createdAt: -1 } }, // 최신순 정렬
      {
        $group: {
          _id: '$from', // from 단위로 묶어서
          doc: { $first: '$$ROOT' }, // 각 from 에 대해 가장 최신 문서 한 개
        },
      },
      { $replaceRoot: { newRoot: '$doc' } }, // doc를 루트로
    ]);

    const totalCnt = latestByFrom.length;

    let greatCnt = 0;
    let goodCnt = 0;

    // 2) great / good 카운트 & 리뷰용 데이터 필터링
    const reviewCandidates = latestByFrom.filter((notice) => {
      if (notice.sub === 'great') greatCnt += 1;
      if (notice.sub === 'good') goodCnt += 1;

      return (
        (notice.sub === 'great' || notice.sub === 'good') &&
        notice.message &&
        notice.message.trim() !== ''
      );
    });

    // 3) 리뷰는 createdAt 기준으로 최신 3개만, _id / __v 제거
    const reviewArr = reviewCandidates
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 3)
      .map(({ _id, __v, ...rest }) => rest); // 필요하면 여기서 명시적으로 필드 선택

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
