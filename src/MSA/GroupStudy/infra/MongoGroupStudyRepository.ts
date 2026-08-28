import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
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
import { IGroupStudyRepository } from '../core/interfaces/GroupStudyRepository.interface';
import { IGroupStudyData } from '../entity/groupStudy.entity';

// seed와 값을 합쳐 결정적인(=같은 입력에 항상 같은 결과) 32비트 해시를 만든다.
// 이 해시로 id를 정렬하면 "seed당 안정적인 랜덤 순서"가 되어, cursor로 그 순서를
// 페이지 단위로 잘라도 중복/스킵 없이 끝까지 순회할 수 있다.
function seededHash(seed: string, value: number): number {
  const str = `${seed}:${value}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

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
    seed?: string,
  ): Promise<GroupStudy[]> {
    if (seed) {
      return this.findWithQueryPopPageSeeded(
        filterQuery,
        seed,
        start || 0,
        gap,
      );
    }

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

  // seed 기준으로 전체 매칭 id를 안정적인 랜덤 순서로 정렬해두고, 그 순서에서
  // start~start+gap 구간만 잘라 조회한다. 같은 seed로 cursor(=start)만 늘려가면
  // 중복/스킵 없이 전체 데이터를 끝까지 순회하고, seed가 바뀌면 순서도 바뀐다.
  private async findWithQueryPopPageSeeded(
    filterQuery: any,
    seed: string,
    start: number,
    gap?: number,
  ): Promise<GroupStudy[]> {
    const idDocs = await this.GroupStudy.find(filterQuery || {})
      .select('id')
      .lean();

    const sortedIds = idDocs
      .map((doc) => doc.id)
      .sort((a, b) => seededHash(seed, a) - seededHash(seed, b));

    const pageIds =
      gap !== undefined
        ? sortedIds.slice(start, start + gap)
        : sortedIds.slice(start);

    if (!pageIds.length) return [];

    const docs = await this.GroupStudy.find({
      ...(filterQuery || {}),
      id: { $in: pageIds },
    })
      .select('-_id')
      .populate({
        path: 'organizer',
        select: ENTITY.USER.C_MINI_USER,
      })
      .populate({
        path: 'participants.user',
        select: ENTITY.USER.C_MINI_USER,
      });

    const orderIndex = new Map(pageIds.map((id, idx) => [id, idx]));
    return docs
      .map((doc) => this.mapToDomain(doc))
      .sort(
        (a, b) => (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0),
      );
  }

  async findByGroupId(groupId: string): Promise<GroupStudy[] | null> {
    const docs = await this.GroupStudy.find({ groupId: groupId });
    return docs.map((doc) => this.mapToDomain(doc));
  }

  async getUserGroupsTitleByUserId(userId: string) {
    const uid = new Types.ObjectId(userId);

    const docs = await this.GroupStudy.aggregate([
      {
        $match: {
          status: 'pending',
          isSecret: { $ne: true },
          participants: { $elemMatch: { user: uid } },
        },
      },
      {
        $addFields: {
          isMember: {
            $anyElementTrue: {
              $map: {
                input: '$participants',
                as: 'p',
                in: {
                  $and: [
                    { $eq: ['$$p.user', uid] },
                    { $in: ['$$p.role', ['regularMember', 'admin']] },
                  ],
                },
              },
            },
          },
        },
      },
      {
        $project: {
          title: 1,
          'category.sub': 1,
          meetingType: 1,
          isMember: 1,
        },
      },
    ]);

    return docs;
  }

  async getSigningGroupByStatus(userId: string, status: string): Promise<any> {
    // const docs = await this.GroupStudy.find({
    //   status: status === 'pending' ? 'pending' : { $in: ['pending', 'end'] },
    //   participants: { $elemMatch: { user: userId } }, // userId가 일치하는지 확인
    // });
    const userObjectId = new Types.ObjectId(userId);

    const docs = await this.GroupStudy.aggregate([
      {
        $match: {
          status:
            status === 'pending' ? 'pending' : { $in: ['pending', 'end'] },

          participants: { $elemMatch: { user: userObjectId } },
        },
      },
      {
        $addFields: {
          isMember: {
            $anyElementTrue: {
              $map: {
                input: '$participants',
                as: 'p',
                in: {
                  $and: [
                    { $eq: ['$$p.user', userObjectId] },
                    { $in: ['$$p.role', ['regularMember', 'admin']] },
                  ],
                },
              },
            },
          },
        },
      },
      {
        $project: {
          title: 1,
          squareImage: 1,
          id: 1,
          requiredTicket: 1,
          meetingType: 1,
          isMember: 1,
        },
      },
    ]);

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
        select: ENTITY.USER.C_SIMPLE_USER + 'telephone',
      })
      .select('-_id');

    doc.participants = (doc.participants || []).filter((p: any) => p.user);
    doc.waiting = (doc.waiting || []).filter((w: any) => w.user);

    return doc ? this.mapToDomain(doc) : null;
  }

  async findAll(): Promise<GroupStudy[]> {
    const docs = await this.GroupStudy.find({});

    return docs.map((doc) => this.mapToDomain(doc));
  }

  async findAllForLLM(): Promise<Partial<IGroupStudyData>[]> {
    const docs = await this.GroupStudy.find(
      {},
      'id title category age hashtag',
    );
    return docs;
  }

  async findById(
    groupStudyId: string,
    isPopulate?: boolean,
  ): Promise<GroupStudy | null> {
    let query = this.GroupStudy.findOne({ id: groupStudyId });

    if (isPopulate) {
      query = query.populate('participants.user');
    }

    const doc = await query;

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

  async addParticipantIfAbsent(
    groupStudyId: string,
    userId: string,
    participant: ParticipantProps,
  ): Promise<GroupStudy | null> {
    const updatedDoc = await this.GroupStudy.findOneAndUpdate(
      {
        id: groupStudyId,
        'participants.user': { $ne: userId },
      },
      {
        $push: { participants: participant },
      },
      { new: true },
    );

    return updatedDoc ? this.mapToDomain(updatedDoc) : null;
  }

  async findByIdWithWaiting(groupStudyId: string): Promise<GroupStudy | null> {
    const doc = await this.GroupStudy.findOne({ id: groupStudyId })
      .populate({
        path: 'waiting.user',
        select: ENTITY.USER.C_SIMPLE_USER + 'telephone',
      })
      .select('-_id');

    return doc ? this.mapToDomain(doc) : null;
  }

  async create(entity: GroupStudy): Promise<GroupStudy> {
    const docToCreate = this.mapToDb(entity);
    const createdDoc = await this.GroupStudy.create(docToCreate);
    return this.mapToDomain(createdDoc);
  }

  async test() {
    //모든 participants의 registerDate를 null로 변경
    await this.GroupStudy.updateMany(
      {},
      {
        $set: { 'participants.$[].registerDate': null },
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
        status: p.status as ParticipantProps['status'],
        registerDate: p.registerDate,
        isDummy: p.isDummy,
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
      googleFormUrl: doc?.googleFormUrl,
      requiredTicket: doc?.requiredTicket,
      totalDeposit: doc?.totalDeposit,
      randomTicket: doc?.randomTicket,
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
      status: pt.status,
      registerDate: pt.registerDate || null,
      isDummy: pt.isDummy,
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
      randomTicket: p.randomTicket,
    };
  }
}
