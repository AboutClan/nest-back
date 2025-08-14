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

    return result.map((doc) => this.mapToDomain(doc));
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

  async findByPeriod(
    firstDay: Date,
    secondDay: Date,
  ): Promise<Gather[] | null> {
    const result = await this.Gather.find({
      date: {
        $gte: firstDay.toISOString(), // 현재보다 이전
        $lte: secondDay.toISOString(), // 24시간 전보다 이후
      },
    }).sort({ createdAt: -1 });

    return result.map((doc) => this.mapToDomain(doc));
  }

  async findById(gatherId: number, pop?: boolean): Promise<Gather | null> {
    let query = this.Gather.findOne({ id: gatherId });

    if (pop) {
      query = query
        .populate({
          path: 'participants.user',
          select: ENTITY.USER.C_SIMPLE_USER,
        })
        .populate({
          path: 'waiting.user',
          select: ENTITY.USER.C_SIMPLE_USER,
        })
        .populate({
          path: 'user',
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
    const updateData = { ...gatherData };
    delete updateData._id;
    await this.Gather.updateOne({ id: gatherId }, { $set: updateData });
    return null;
  }

  async findWithQueryPop(
    query: any,
    cursor?: number,
    sort?: any,
  ): Promise<Gather[] | null> {
    const gap = 15;
    const start = gap * (cursor || 0);

    const results = await this.Gather.find(query)
      .sort(sort ? sort : { date: 1 })
      .skip(start)
      .limit(gap)
      .select('-_id')
      .populate({ path: 'user', select: ENTITY.USER.C_MINI_USER })
      .populate({
        path: 'participants.user',
        select: ENTITY.USER.C_MINI_USER,
      });

    return results.map((doc) => this.mapToDomain(doc));
  }

  async findThree(): Promise<Gather[] | null> {
    const gatherData1 = await this.Gather.find()
      .sort({ createdAt: -1 })
      .limit(6)
      .populate({
        path: 'user',
        select: ENTITY.USER.C_MINI_USER,
      })
      .populate({
        path: 'participants.user',
        select: ENTITY.USER.C_MINI_USER,
      });

    const gatherData2 = await this.Gather.find({
      status: 'pending',
      $expr: {
        $gte: [{ $add: [{ $size: '$participants' }, 4] }, '$memberCnt.max'],
      },
    })
      .sort({ date: 1 })
      .limit(6)
      .populate({
        path: 'user',
        select: ENTITY.USER.C_MINI_USER,
      })
      .populate({
        path: 'participants.user',
        select: ENTITY.USER.C_MINI_USER,
      });

    const gatherData3 = await this.Gather.find({
      'participants.9': { $exists: true },
    })
      .sort({ createdAt: -1 })
      .limit(7)
      .populate({
        path: 'user',
        select: ENTITY.USER.C_MINI_USER,
      })
      .populate({
        path: 'participants.user',
        select: ENTITY.USER.C_MINI_USER,
      });

    return [...gatherData1, ...gatherData2, ...gatherData3].map((doc) =>
      this.mapToDomain(doc),
    );
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

  async deleteById(gatherId: number): Promise<any> {
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

  async findByGroupId(groupId: string, type: string): Promise<Gather[] | null> {
    const result = await this.Gather.find({
      groupId,
      category: type,
    })
      .populate([
        { path: 'user', select: ENTITY.USER.C_SIMPLE_USER },
        { path: 'participants.user', select: ENTITY.USER.C_SIMPLE_USER },
      ])
      .sort({ createdAt: -1 });

    return result.map((doc) => this.mapToDomain(doc));
  }

  private mapToDomain(doc: IGatherData): Gather {
    return new Gather({
      _id: doc._id as string,
      title: doc.title,
      type: {
        title: doc.type?.title ?? null,
        subtitle: doc.type?.subtitle ?? null,
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
        absence: p.absence,
      })),
      user: doc.user as string,
      id: doc.id,
      date: doc.date,
      place: doc.place ?? null,
      isAdminOpen: doc.isAdminOpen ?? null,
      image: doc.image ?? null,
      coverImage: doc.coverImage ?? null,
      postImage: doc.postImage ?? null,
      kakaoUrl: doc.kakaoUrl ?? null,
      waiting: doc.waiting.map((w: any) => ({
        user: w.user,
        phase: w.phase,
        createdAt: w.createdAt || new Date(),
      })),
      isApprovalRequired: doc.isApprovalRequired ?? null,
      reviewers: doc.reviewers ?? [],
      deposit: doc.deposit,
      category: doc.category ?? 'gather',
      groupId: doc.groupId ?? null,
    });
  }

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
      location: props?.location
        ? {
            main: props.location.main,
            sub: props.location.sub,
          }
        : null,
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
        absence: p.absence,
      })),
      user: props.user,
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
      deposit: props.deposit,
      category: props.category as any,
      groupId: props.groupId ?? null,
    };
  }
}
