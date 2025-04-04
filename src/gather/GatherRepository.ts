import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { C_simpleUser } from 'src/Constants/constants';
import { Gather } from 'src/domain/entities/Gather/Gather';
import { IGATHER_REPOSITORY } from 'src/utils/di.tokens';
import { IGatherData } from './gather.entity';
import { IGatherRepository } from './GatherRepository.interface';

export class GatherRepository implements IGatherRepository {
  constructor(
    @InjectModel(IGATHER_REPOSITORY)
    private readonly GatherModel: Model<IGatherData>,
  ) {}

  async findById(gatherId: string) {
    const doc = await this.GatherModel.findOne({ id: gatherId });

    return this.mapToDomain(doc);
  }
  async findByIdJoin(gatherId: string) {
    const doc = await this.GatherModel.findOne({ id: gatherId })
      .populate(['user', 'participants.user', 'waiting.user', 'comments.user'])
      .populate({
        path: 'comments.subComments.user',
        select: C_simpleUser,
      });
    return this.mapToDomain(doc);
  }

  private mapToDomain(doc: IGatherData): Gather {
    return new Gather({
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
        userId: p.user.toString(), // ObjectId → string
        phase: p.phase,
        invited: p.invited,
      })),
      userId: doc.user.toString(), // 작성자
      // comments는 하위 도메인 엔티티로 매핑할 수 있지만, 여기서는 간단하게 plain object로 전달
      comments: doc.comments.map((c: any) => ({
        userId: c.user.toString(),
        comment: c.comment,
        likeList: c.likeList || [],
        subComments: (c.subComments || []).map((sc: any) => ({
          userId: sc.user.toString(),
          comment: sc.comment,
          likeList: sc.likeList || [],
        })),
      })),
      id: doc.id,
      date: doc.date,
      place: doc.place ?? null,
      isAdminOpen: doc.isAdminOpen ?? null,
      image: doc.image ?? null,
      kakaoUrl: doc.kakaoUrl ?? null,
      waiting: doc.waiting.map((w: any) => ({
        userId: w.user.toString(),
        phase: w.phase,
      })),
      isApprovalRequired: doc.isApprovalRequired ?? null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }

  // DB로 저장하기 위한 객체 변환: Domain Entity → Mongoose Document 형태 (Partial)
  private mapToDB(gather: Gather): Partial<IGatherData> {
    const props = gather.toPrimitives();
    return {
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
        user: p.userId, // Mongoose가 문자열을 ObjectId로 변환할 수 있음
        phase: p.phase,
        invited: p.invited,
      })),
      user: props.userId,
      comments: props.comments.map((c) => ({
        user: c.userId,
        comment: c.comment,
        likeList: c.likeList,
        subComments: c.subComments?.map((sc) => ({
          user: sc.userId,
          comment: sc.comment,
          likeList: sc.likeList,
        })),
      })),
      id: props.id,
      date: props.date,
      place: props.place,
      isAdminOpen: props.isAdminOpen,
      image: props.image,
      kakaoUrl: props.kakaoUrl,
      waiting: props.waiting.map((w) => ({
        user: w.userId,
        phase: w.phase,
      })),
      isApprovalRequired: props.isApprovalRequired,
      // createdAt, updatedAt는 timestamps 옵션에 의해 자동 관리되므로 별도 세팅하지 않습니다.
    };
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
}
