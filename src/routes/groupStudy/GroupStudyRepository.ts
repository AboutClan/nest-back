import {
  AttendanceProps,
  CategoryProps,
  CommentProps,
  GroupStudy,
  GroupStudyProps,
  MemberCntProps,
  ParticipantProps,
  SubCommentProps,
  WaitingProps,
  WeekRecordProps,
} from 'src/domain/entities/GroupStudy';
import { IGroupStudyData } from './groupStudy.entity';
import { IGroupStudyRepository } from './GroupStudyRepository.interface';
import { InjectModel } from '@nestjs/mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { Model } from 'mongoose';
import { ENTITY } from 'src/Constants/ENTITY';

export class GroupStudyRepository implements IGroupStudyRepository {
  constructor(
    @InjectModel(DB_SCHEMA.GROUPSTUDY)
    private readonly GroupStudy: Model<IGroupStudyData>,
  ) {}

  async findWithQueryPopPage(
    filterQuery: any,
    start?: number,
    gap?: number,
  ): Promise<GroupStudy[]> {
    let query = this.GroupStudy.find(filterQuery || {}).select('-_id');

    if (start !== undefined) {
      query = query.skip(start);
    }
    if (gap !== undefined) {
      query = query.limit(gap);
    }

    const docs = await query
      .populate({
        path: 'organizer',
        select: 'name profileImage uid score avatar comment',
      })
      .populate({
        path: 'participants.user',
        select: ENTITY.USER.C_SIMPLE_USER,
      })
      .populate({
        path: 'waiting.user',
        select: ENTITY.USER.C_SIMPLE_USER,
      })
      .populate({
        path: 'comments.user',
        select: ENTITY.USER.C_SIMPLE_USER,
      })
      .populate({
        path: 'comments.subComments.user',
        select: ENTITY.USER.C_SIMPLE_USER,
      });

    return docs.map((doc) => this.mapToDomain(doc));
  }

  async getUserGroupsTitleByUserId(userId: string): Promise<any> {
    const docs = await this.GroupStudy.find(
      {
        status: 'pending',
        participants: { $elemMatch: { user: userId } }, // userId가 일치하는지 확인
        isSecret: { $ne: true },
      },
      'title category.sub meetingType',
    );

    return docs;
  }

  async getSigningGroupByStatus(userId: string, status: string): Promise<any> {
    const docs = await this.GroupStudy.find({
      status: status === 'pending' ? 'pending' : { $in: ['pending', 'end'] },
      participants: { $elemMatch: { user: userId } }, // userId가 일치하는지 확인
      'category.main': { $ne: '콘텐츠' },
    }).populate({
      path: 'participants.user', // participants 배열 내부의 user 필드를 populate
      select: 'name profileImage uid score avatar comment', // 필요한 필드만 선택
    });

    return docs;
  }

  async findByIdWithPop(groupStudyId: number): Promise<GroupStudy | null> {
    const doc = await this.GroupStudy.findOne({
      id: groupStudyId,
    })
      .populate({
        path: 'organizer',
        select: 'name profileImage uid score avatar comment',
      })
      .populate({
        path: 'participants.user',
        select: ENTITY.USER.C_SIMPLE_USER,
      })
      .populate({
        path: 'waiting.user',
        select: ENTITY.USER.C_SIMPLE_USER,
      })
      .populate({
        path: 'comments.user',
        select: ENTITY.USER.C_SIMPLE_USER,
      })
      .populate({
        path: 'comments.subComments.user',
        select: 'name profileImage uid score avatar comment location',
      })
      .select('-_id');

    return doc ? this.mapToDomain(doc) : null;
  }

  async findAll(): Promise<GroupStudy[]> {
    const docs = await this.GroupStudy.find({});

    return docs.map((doc) => this.mapToDomain(doc));
  }

  async findById(groupStudyId: string): Promise<GroupStudy | null> {
    const doc = await this.GroupStudy.findOne({ id: groupStudyId });

    return doc ? this.mapToDomain(doc) : null;
  }

  async initWeekAttendance(): Promise<void> {
    await this.GroupStudy.updateMany(
      {},
      {
        'participants.$[].weekAttendance': false,
      },
    );
    return;
  }

  async findMyGroupStudyComment(userId: string): Promise<any[]> {
    const result = await this.GroupStudy.find({
      participants: {
        $elemMatch: { user: userId },
      },
    }).select('-_id comments');

    return result;
  }

  async save(entity: GroupStudy): Promise<GroupStudy> {
    const docToSave = this.mapToDb(entity);

    const updatedDoc = await this.GroupStudy.findByIdAndUpdate(
      docToSave._id,
      docToSave,
      { new: true },
    );

    return this.mapToDomain(updatedDoc);
  }

  /** Mongoose Document → 도메인 엔티티 */
  private mapToDomain(doc: IGroupStudyData): GroupStudy {
    // category
    const category: CategoryProps = {
      main: doc.category.main,
      sub: doc.category.sub,
    };

    // memberCnt
    const memberCnt: MemberCntProps = {
      min: doc.memberCnt.min,
      max: doc.memberCnt.max,
    };

    // participants
    const participants: ParticipantProps[] = (doc.participants || []).map(
      (p) => ({
        userId: p.user.toString(),
        randomId: p.randomId,
        role: p.role as ParticipantProps['role'],
        attendCnt: p.attendCnt,
        weekAttendance: p.weekAttendance,
      }),
    );

    // comments
    const comments: CommentProps[] = (doc.comments || []).map((c: any) => {
      const subComments: SubCommentProps[] = (c.subComments || []).map(
        (s: any) => ({
          _id: s._id,
          userId: s.user.toString(),
          comment: s.comment,
          likeList: s.likeList || [],
          createdAt: s.createdAt || new Date(),
        }),
      );

      return {
        _id: c._id,
        userId: c.user.toString(),
        comment: c.comment,
        subComments,
        likeList: c.likeList || [],
        createdAt: c.createdAt || new Date(),
      };
    });

    // waiting
    const waiting: WaitingProps[] = (doc.waiting || []).map((w) => ({
      userId: w.user.toString(),
      answer: w.answer,
      pointType: w.pointType,
    }));

    // week records (attendance.lastWeek, attendance.thisWeek)
    const toWeekRecord = (w: any): WeekRecordProps => ({
      uid: w.uid,
      name: w.name,
      attendRecord: w.attendRecord,
      attendRecordSub: w.attendRecordSub || [],
    });

    const attendance: AttendanceProps = {
      firstDate: doc.attendance.firstDate,
      lastWeek: (doc.attendance.lastWeek || []).map(toWeekRecord),
      thisWeek: (doc.attendance.thisWeek || []).map(toWeekRecord),
    };

    // 최종 GroupStudyProps 구성
    const props: GroupStudyProps = {
      _id: doc._id.toString(),
      id: doc.id,
      title: doc.title,
      category,
      challenge: doc.challenge,
      rules: doc.rules,
      content: doc.content,
      period: doc.period,
      guide: doc.guide,
      gender: doc.gender,
      age: doc.age,
      organizerId: doc.organizer.toString(),
      memberCnt,
      password: doc.password,
      status: doc.status,
      participants,
      userId: doc.user.toString(),
      comments,
      location: doc.location,
      image: doc.image,
      isFree: doc.isFree,
      feeText: doc.feeText,
      fee: doc.fee,
      questionText: doc.questionText,
      hashTag: doc.hashTag,
      attendance,
      link: doc.link,
      isSecret: doc.isSecret,
      waiting,
      squareImage: doc.squareImage,
      meetingType: doc.meetingType,
      createdAt: (doc as any).createdAt,
      updatedAt: (doc as any).updatedAt,
    };

    return new GroupStudy(props);
  }

  /** 도메인 엔티티 → DB 저장용 Plain Object */
  private mapToDb(entity: GroupStudy): Partial<IGroupStudyData> {
    const p = entity.toPrimitives();

    // 변환된 Plain Object를 Mongoose 스키마 구조에 맞게 가공
    const participantsDb = p.participants.map((pt) => ({
      user: pt.userId,
      randomId: pt.randomId,
      role: pt.role,
      attendCnt: pt.attendCnt,
      weekAttendance: pt.weekAttendance,
    }));

    const commentsDb = (p.comments || []).map((c) => ({
      user: c.userId,
      comment: c.comment,
      subComments: c.subComments.map((s) => ({
        user: s.userId,
        comment: s.comment,
        likeList: s.likeList,
      })),
      likeList: c.likeList,
    }));

    const waitingDb = (p.waiting || []).map((w) => ({
      user: w.userId,
      answer: w.answer,
      pointType: w.pointType,
    }));

    const toWeekDoc = (w: WeekRecordProps) => ({
      uid: w.uid,
      name: w.name,
      attendRecord: w.attendRecord,
      attendRecordSub: w.attendRecordSub || [],
    });

    const attendanceDb = {
      firstDate: p.attendance.firstDate,
      lastWeek: p.attendance.lastWeek.map(toWeekDoc),
      thisWeek: p.attendance.thisWeek.map(toWeekDoc),
    };

    return {
      title: p.title,
      category: {
        main: p.category.main,
        sub: p.category.sub,
      },
      challenge: p.challenge,
      rules: p.rules,
      content: p.content,
      period: p.period,
      guide: p.guide,
      gender: p.gender,
      age: p.age,
      organizer: p.organizerId,
      memberCnt: {
        min: p.memberCnt.min,
        max: p.memberCnt.max,
      },
      password: p.password,
      status: p.status as IGroupStudyData['status'],
      participants: participantsDb as IGroupStudyData['participants'],
      user: p.userId,
      comments: commentsDb,
      location: p.location as IGroupStudyData['location'],
      image: p.image,
      isFree: p.isFree,
      feeText: p.feeText,
      fee: p.fee,
      questionText: p.questionText,
      hashTag: p.hashTag,
      attendance: attendanceDb,
      link: p.link,
      isSecret: p.isSecret,
      waiting: waitingDb,
      squareImage: p.squareImage,
      meetingType: p.meetingType as IGroupStudyData['meetingType'],
      id: p.id,
    };
  }
}
