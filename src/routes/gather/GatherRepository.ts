import { HttpException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import dayjs from 'dayjs';
import { Model, SortOrder, Types } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { ENTITY } from 'src/Constants/ENTITY';
import { Gather } from 'src/domain/entities/Gather/Gather';
import { IGatherData } from './gather.entity';
import { IGatherRepository } from './GatherRepository.interface';

export class GatherRepository implements IGatherRepository {
  constructor(
    @InjectModel(DB_SCHEMA.GATHER)
    private readonly Gather: Model<IGatherData>,
  ) {}

  async findMyGather(userId: string): Promise<Gather[] | null> {
    const result = await this.Gather.find({
      $or: [
        { user: new Types.ObjectId(userId) },
        { participants: { $elemMatch: { user: userId } } },
      ],
    })
      .populate([
        { path: 'user', select: ENTITY.USER.C_SIMPLE_USER },
        { path: 'participants.user', select: ENTITY.USER.C_SIMPLE_USER },
      ])
      .sort({ createdAt: -1 });

    return result
      .filter((props) => dayjs(props.date).isBefore(dayjs()))
      .map((doc) => this.mapToDomain(doc));
  }

  async findMyGatherId(userId: string) {
    const result = await this.Gather.find({
      participants: {
        $elemMatch: { user: userId },
      },
    })
      .select('-_id id')
      .sort({ createdAt: -1 });

    return result;
  }

  async findById(gatherId: number, pop?: boolean): Promise<Gather | null> {
    let query = this.Gather.findOne({ id: gatherId });

    if (pop) {
      query = query
        .populate([
          'user',
          'participants.user',
          'waiting.user',
          'comments.user',
        ])
        .populate({
          path: 'comments.subComments.user',
          select: ENTITY.USER.C_SIMPLE_USER,
        });
    }
    const result = await query.exec();

    return result ? this.mapToDomain(result) : null;
  }

  async updateGather(
    gatherId: number,
    gatherData: Partial<IGatherData>,
  ): Promise<null> {
    await this.Gather.updateOne({ id: gatherId }, gatherData);
    return null;
  }

  async findWithQueryPop(
    query: any,
    start?: number,
    gap?: number,
    sortBy: 'createdAt' | 'date' = 'createdAt',
  ): Promise<Gather[] | null> {
    const sortOption: { [key: string]: SortOrder } = { [sortBy]: -1 };
    const result = await this.Gather.find(query)
      .sort(sortOption)
      .skip(start)
      .limit(gap)
      .select('-_id')
      .populate(['user', 'participants.user', 'waiting.user', 'comments.user'])
      .populate({
        path: 'comments.subComments.user',
        select: ENTITY.USER.C_SIMPLE_USER,
      });

    return result.map((doc) => this.mapToDomain(doc));
  }

  async findThree(): Promise<Gather[] | null> {
    const gatherData = await this.Gather.find()
      .sort({ createdAt: -1 })
      .limit(6)
      .populate(['user', 'participants.user', 'waiting.user', 'comments.user'])
      .populate({
        path: 'comments.subComments.user',
        select: ENTITY.USER.C_SIMPLE_USER,
      });

    return gatherData.map((doc) => this.mapToDomain(doc));
  }

  async createGather(gatherData: Partial<Gather>): Promise<Gather> {
    const dbData = this.mapToDB(gatherData as Gather);
    const created = await this.Gather.create(dbData);
    return this.mapToDomain(created);
  }

  async getEnthMembers() {
    try {
      const startOfMonth = new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1,
      ).toISOString();
      const endOfMonth = new Date(
        new Date().getFullYear(),
        new Date().getMonth() + 1,
        0,
      ).toISOString();

      const result = await this.Gather.aggregate([
        {
          $match: {
            date: {
              $gte: startOfMonth,
              $lte: endOfMonth,
            },
          },
        },
        { $unwind: '$participants' },
        {
          $group: {
            _id: '$participants.user',
            count: { $sum: 1 },
          },
        },
        {
          $match: {
            count: { $gte: 3 },
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'userDetails',
          },
        },
        {
          $unwind: '$userDetails', // userDetails 배열을 펼침
        },
        {
          $project: {
            _id: 1,
            count: 1,
            uid: '$userDetails.uid', // userDetails.uid를 바로 꺼냄
            name: '$userDetails.name', // userDetails.name을 바로 꺼냄
          },
        },
      ]);

      return result;
    } catch (error) {
      console.error('Error:', error);
    }
  }

  async deleteById(gatherId: string): Promise<any> {
    return await this.Gather.deleteOne({ id: gatherId });
  }

  async save(doc: Gather): Promise<Gather> {
    const docToSave = this.mapToDB(doc);

    const updatedDoc = await this.Gather.findByIdAndUpdate(
      docToSave._id,
      docToSave,
      { new: true },
    );

    if (!updatedDoc) {
      throw new HttpException(`Gather not found for id=${docToSave._id}`, 500);
    }

    return this.mapToDomain(updatedDoc);
  }

  async updateNotOpened(current: Date) {
    await this.Gather.updateMany(
      {
        $and: [
          { status: { $eq: 'pending' } },
          { date: { $lt: current.toISOString() } },
        ],
      },
      [
        {
          $set: {
            status: {
              $cond: {
                if: {
                  $lt: [
                    { $add: [{ $size: '$participants' }, 1] },
                    '$memberCnt.min',
                  ],
                },
                then: 'close',
                else: 'open',
              },
            },
          },
        },
      ],
    );
  }

  private mapToDomain(doc: IGatherData): Gather {
    return new Gather({
      _id: doc._id as string,
      title: doc.title,
      type: {
        title: doc.type.title,
        subtitle: doc.type.subtitle ?? null,
      },
      gatherList: doc.gatherList.map((g: any) => ({
        text: g.text,
        time: {
          hours: g.time.hours,
          minutes: g.time.minutes,
        },
      })),
      content: doc.content,
      location: {
        main: doc.location.main,
        sub: doc.location.sub,
      },
      memberCnt: {
        min: doc.memberCnt.min,
        max: doc.memberCnt.max,
      },
      age: doc.age,
      preCnt: doc.preCnt,
      genderCondition: doc.genderCondition,
      password: doc.password ?? null,
      status: doc.status,
      participants: doc.participants.map((p: any) => ({
        user: p.user, // ObjectId → string
        phase: p.phase,
        invited: p.invited,
      })),
      user: doc.user as string,
      // comments는 하위 도메인 엔티티로 매핑할 수 있지만, 여기서는 간단하게 plain object로 전달
      comments: doc.comments.map((c: any) => ({
        id: c._id as string,
        user: c.user as string,
        comment: c.comment as string,
        likeList: c.likeList || [],
        subComments: (c.subComments || []).map((sc: any) => ({
          id: sc._id as string,
          user: sc.user,
          comment: sc.comment,
          likeList: sc.likeList || [],
        })),
      })),
      id: doc.id,
      date: doc.date,
      place: doc.place ?? null,
      isAdminOpen: doc.isAdminOpen ?? null,
      image: doc.image ?? null,
      coverImage: doc.coverImage ?? null,
      kakaoUrl: doc.kakaoUrl ?? null,
      waiting: doc.waiting.map((w: any) => ({
        user: w.user,
        phase: w.phase,
      })),
      isApprovalRequired: doc.isApprovalRequired ?? null,
      reviewers: doc.reviewers ?? [],
    });
  }

  // DB로 저장하기 위한 객체 변환: Domain Entity → Mongoose Document 형태 (Partial)
  private mapToDB(gather: Gather): Partial<IGatherData> {
    const props = gather.toPrimitives();
    return {
      _id: props._id,
      title: props.title,
      type: {
        title: props.type.title,
        subtitle: props.type.subtitle,
      },
      gatherList: props.gatherList.map((g) => ({
        text: g.text,
        time: {
          hours: g.time.hours,
          minutes: g.time.minutes,
        },
      })),
      content: props.content,
      location: {
        main: props.location.main,
        sub: props.location.sub,
      },
      memberCnt: {
        min: props.memberCnt.min,
        max: props.memberCnt.max,
      },
      age: props.age,
      preCnt: props.preCnt,
      genderCondition: props.genderCondition,
      password: props.password,
      status: props.status,
      participants: props.participants.map((p) => ({
        user: p.user, // Mongoose가 문자열을 ObjectId로 변환할 수 있음
        phase: p.phase,
        invited: p.invited,
      })),
      user: props.user,
      comments: props.comments.map((c) => ({
        user: c.user,
        comment: c.comment,
        likeList: c.likeList,
        subComments: c.subComments?.map((sc) => ({
          id: sc.id,
          user: sc.user,
          comment: sc.comment,
          likeList: sc.likeList,
        })),
      })),
      id: props.id,
      date: props.date,
      place: props.place,
      isAdminOpen: props.isAdminOpen,
      image: props.image,
      coverImage: props.coverImage,
      kakaoUrl: props.kakaoUrl,
      waiting: props.waiting.map((w) => ({
        user: w.user,
        phase: w.phase,
      })),
      isApprovalRequired: props.isApprovalRequired,
      reviewers: props.reviewers,
    };
  }
}
