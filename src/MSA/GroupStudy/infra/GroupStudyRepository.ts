import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { ENTITY } from 'src/Constants/ENTITY';
import {
  AttendanceProps,
  CategoryProps,
  GroupStudy,
  GroupStudyProps,
  MemberCntProps,
  ParticipantProps,
  WaitingProps,
  WeekRecordProps,
} from 'src/MSA/GroupStudy/core/domain/GroupStudy';
import { IGroupStudyData } from '../entity/groupStudy.entity';
import { IGroupStudyRepository } from '../core/interfaces/GroupStudyRepository.interface';

export class GroupStudyRepository implements IGroupStudyRepository {
  constructor(
    @InjectModel(DB_SCHEMA.GROUPSTUDY)
    private readonly GroupStudy: Model<IGroupStudyData>,
  ) {}

  async findAllTemp() {
    const docs = await this.GroupStudy.find({}, '_id comments').lean();
    return docs;
  }

  async findMyGroupStudyId(userId: string) {
    const result = await this.GroupStudy.find({
      participants: {
        $elemMatch: { user: userId },
      },
    }).select('-_id id');

    return result;
  }

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
        select: ENTITY.USER.C_MINI_USER,
      })
      .populate({
        path: 'participants.user',
        select: ENTITY.USER.C_MINI_USER,
      });

    return docs.map((doc) => this.mapToDomain(doc));
  }

  async findByGroupId(groupId: string): Promise<GroupStudy[] | null> {
    const docs = await this.GroupStudy.find({ groupId: groupId });
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
    });

    return docs;
  }

  async findByIdWithPop(groupStudyId: number): Promise<GroupStudy | null> {
    const doc = await this.GroupStudy.findOne({
      id: groupStudyId,
    })
      .populate({
        path: 'organizer',
        select: ENTITY.USER.C_SIMPLE_USER,
      })
      .populate({
        path: 'participants.user',
        select: ENTITY.USER.C_SIMPLE_USER,
      })
      .populate({
        path: 'waiting.user',
        select: ENTITY.USER.C_SIMPLE_USER,
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

  async findBy_Id(groupStudyId: string): Promise<GroupStudy | null> {
    const doc = await this.GroupStudy.findOne({ _id: groupStudyId });

    return doc ? this.mapToDomain(doc) : null;
  }

  async findEnthMembers() {
    try {
      // Aggregation Pipeline
      const result = await this.GroupStudy.aggregate([
        { $unwind: '$participants' }, // Unwind the participants array
        {
          $group: {
            _id: '$participants.user', // Group by user ID
            count: { $sum: 1 }, // Count occurrences
          },
        },
        {
          $match: {
            count: { $gte: 3 }, // Find users with 3 or more occurrences
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
      console.error(error);
    }
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

  async findByIdWithWaiting(groupStudyId: string): Promise<GroupStudy | null> {
    const doc = await this.GroupStudy.findOne({ id: groupStudyId })
      .populate({ path: 'waiting.user', select: ENTITY.USER.C_SIMPLE_USER })
      .select('-_id');

    return doc ? this.mapToDomain(doc) : null;
  }

  async create(entity: GroupStudy): Promise<GroupStudy> {
    const docToCreate = this.mapToDb(entity);
    const createdDoc = await this.GroupStudy.create(docToCreate);
    return this.mapToDomain(createdDoc);
  }

  async test() {
    await this.GroupStudy.updateMany(
      {},
      {
        $set: { 'participants.$[].monthAttendance': true },
      },
    );
  }

  /** Mongoose Document → 도메인 엔티티 */
  private mapToDomain(doc: IGroupStudyData): GroupStudy {
    // category
    const category: CategoryProps = {
      main: doc?.category?.main,
      sub: doc?.category?.sub,
    };

    // memberCnt
    const memberCnt: MemberCntProps = {
      min: doc?.memberCnt?.min,
      max: doc?.memberCnt?.max,
    };

    // participants
    const participants: ParticipantProps[] = (doc.participants || []).map(
      (p) => ({
        user: p.user as string,
        randomId: p.randomId,
        role: p.role as ParticipantProps['role'],
        deposit: p.deposit,
        monthAttendance: p.monthAttendance || true,
        lastMonthAttendance: p.lastMonthAttendance || true,
      }),
    );

    // waiting
    const waiting: WaitingProps[] = (doc.waiting || []).map((w) => ({
      user: w.user as string,
      answer: Array.isArray(w.answer) ? w.answer : [w.answer],
      pointType: w.pointType,
      createdAt: w.createdAt,
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

    let questionText = doc.questionText || [''];
    if (!Array.isArray(questionText)) {
      questionText = [questionText];
    }
    // 최종 GroupStudyProps 구성
    const props: GroupStudyProps = {
      _id: doc._id?.toString(),
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
      organizer: doc.organizer,
      memberCnt,
      password: doc.password,
      status: doc.status,
      participants,
      userId: doc.user,
      location: doc.location,
      image: doc.image,
      isFree: doc.isFree,
      feeText: doc.feeText,
      fee: doc.fee,
      questionText: questionText,
      hashTag: doc.hashTag,
      attendance,
      link: doc.link,
      isSecret: doc.isSecret,
      waiting,
      squareImage: doc.squareImage,
      meetingType: doc.meetingType,
      createdAt: (doc as any).createdAt,
      updatedAt: (doc as any).updatedAt,
      notionUrl: doc?.notionUrl,
      requiredTicket: doc?.requiredTicket,
      totalDeposit: doc?.totalDeposit,
    };

    return new GroupStudy(props);
  }

  /** 도메인 엔티티 → DB 저장용 Plain Object */
  private mapToDb(entity: GroupStudy): Partial<IGroupStudyData> {
    const p = entity.toPrimitives();

    // 변환된 Plain Object를 Mongoose 스키마 구조에 맞게 가공
    const participantsDb = p.participants.map((pt) => ({
      user: pt.user,
      randomId: pt.randomId,
      role: pt.role,
      deposit: pt.deposit,
      monthAttendance: pt.monthAttendance,
      lastMonthAttendance: pt.lastMonthAttendance,
      createdAt: pt.createdAt,
    }));

    const waitingDb = (p.waiting || []).map((w) => ({
      user: w.user,
      answer: w.answer,
      pointType: w.pointType,
      createdAt: w.createdAt,
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
      _id: p._id || undefined,
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
      organizer: p.organizer,
      memberCnt: {
        min: p.memberCnt.min,
        max: p.memberCnt.max,
      },
      password: p.password,
      status: p.status as IGroupStudyData['status'],
      participants: participantsDb as IGroupStudyData['participants'],
      user: p.userId,
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
      requiredTicket: p.requiredTicket,
    };
  }
}
