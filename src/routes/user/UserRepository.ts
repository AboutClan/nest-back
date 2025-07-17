import { User } from 'src/domain/entities/User/User';
import { IUser } from './user.entity';
import { IUserRepository } from './UserRepository.interface';
import { Rest } from 'src/domain/entities/User/Rest';
import { Avatar } from 'src/domain/entities/User/Avatar';
import { Major } from 'src/domain/entities/User/Major';
import { Interest } from 'src/domain/entities/User/Interest';
import { LocationDetail } from 'src/domain/entities/User/Location';
import { Preference } from 'src/domain/entities/User/Preference';
import { Ticket } from 'src/domain/entities/User/Ticket';
import { Badge } from 'src/domain/entities/User/Badge';
import { StudyRecord } from 'src/domain/entities/User/StudyRecord';
import { Temperature } from 'src/domain/entities/User/Temperature';
import { InjectModel } from '@nestjs/mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { Model } from 'mongoose';

export class UserRepository implements IUserRepository {
  constructor(
    @InjectModel(DB_SCHEMA.USER) private readonly UserModel: Model<IUser>,
  ) {}

  async updateUser(uid: string, updateInfo: any): Promise<null> {
    console.log(uid, updateInfo);
    await this.UserModel.findOneAndUpdate(
      { uid },
      { $set: updateInfo },
      { new: true, upsert: false },
    );
    return null;
  }

  async updateGroupStudyTicket(userId: string, value: number) {
    await this.UserModel.findOneAndUpdate(
      {
        _id: userId,
      },
      {
        $inc: { 'ticket.groupStudyTicket': value },
      },
      { new: true, upsert: false },
    );
    return null;
  }

  async updateTicketWithUserIds(userIds: string[], ticketNum: number) {
    await this.UserModel.updateMany(
      { _id: { $in: userIds } },
      { $inc: { 'ticket.groupStudyTicket': ticketNum } },
    );
  }

  async findAll(queryString?: string): Promise<User[]> {
    const users = queryString
      ? await this.UserModel.find({}, queryString)
      : await this.UserModel.find();

    return users.map((user) => this.mapToDomain(user));
  }

  async findByUid(uid: string, queryString?: string): Promise<User | null> {
    if (queryString) {
      return await this.UserModel.findOne({ uid }, queryString);
    } else {
      const user = await this.UserModel.findOne({ uid });
      if (!user) return null;
      return this.mapToDomain(user);
    }
  }

  async findByUidProjection(
    uid: string,
    projection?: string,
  ): Promise<Partial<Record<keyof User, any>> | null> {
    // lean()을 쓰면 Mongoose Document가 아닌 순수 JS 객체가 돌아오므로
    // missing field는 undefined, 나머지는 그대로 꺼낼 수 있습니다.
    const doc = await this.UserModel.findOne({ uid })
      .select(projection || '')
      .lean()
      .exec();

    return doc as any; // Partial<UserProps>
  }

  async findByUserId(userId: string): Promise<User | null> {
    const user = await this.UserModel.findById(userId).exec();
    if (!user) return null;
    return this.mapToDomain(user);
  }

  async findByUids(uids: string[]): Promise<User[]> {
    const users = await this.UserModel.find({ uid: { $in: uids } }).exec();
    return users.map((user) => this.mapToDomain(user));
  }

  async findByIsActive(
    isActive: boolean,
    queryString?: string,
  ): Promise<User[]> {
    const users = queryString
      ? await this.UserModel.find({ isActive }, queryString)
      : await this.UserModel.find({ isActive });

    return users.map((user) => this.mapToDomain(user));
  }
  async findByIsActiveUid(
    uid: string,
    isActive: boolean,
    queryString?: string,
  ): Promise<User[]> {
    const users = await this.UserModel.find({ uid, isActive }, queryString);
    return users.map((user) => this.mapToDomain(user));
  }

  async create(user: User): Promise<User> {
    const toSave = this.mapToDb(user);
    const created = await this.UserModel.create(toSave);
    return this.mapToDomain(created);
  }

  async save(user: User): Promise<User> {
    const p = user.toPrimitives();
    const updated = await this.UserModel.findByIdAndUpdate(
      p._id,
      this.mapToDb(user),
      { new: true },
    ).exec();
    if (!updated) throw new Error(`User not found: ${p._id}`);
    return this.mapToDomain(updated);
  }

  async resetGatherTicket(): Promise<null> {
    await this.UserModel.findOneAndUpdate(
      { 'ticket.gatherTicket': { $lt: 3 } },
      {
        $set: { 'ticket.gatherTicket': 3 },
      },
      { new: true, upsert: false },
    );
    return null;
  }

  async initMonthScore(): Promise<null> {
    await this.UserModel.updateMany({}, { $set: { monthScore: 0 } });
    return null;
  }

  async resetPointByMonthScore(maxDate: string) {
    await this.UserModel.updateMany(
      {
        monthScore: { $lte: 10 },
        role: { $ne: 'resting' },
        registerDate: { $lt: maxDate },
      },
      { $inc: { point: -1000 } },
    );
  }

  async resetMonthScore() {
    await this.UserModel.updateMany({}, { monthScore: 0 });
  }

  async processTicket() {
    // A유형 (<36.5)
    await this.UserModel.updateMany(
      { 'temperature.temperature': { $lt: 36.5 } },
      [
        { $set: { 'ticket.gatherTicket': 1 } },
        {
          $set: {
            'ticket.groupStudyTicket': {
              $min: [{ $add: ['$ticket.groupStudyTicket', 1] }, 4],
            },
          },
        },
      ],
    );

    // B유형 (36.5 ≤ t < 38)
    await this.UserModel.updateMany(
      { 'temperature.temperature': { $gte: 36.5, $lt: 38 } },
      [
        { $set: { 'ticket.gatherTicket': 2 } },
        {
          $set: {
            'ticket.groupStudyTicket': {
              $min: [{ $add: ['$ticket.groupStudyTicket', 2] }, 4],
            },
          },
        },
      ],
    );

    // C유형 (38 ≤ t < 40)
    await this.UserModel.updateMany(
      { 'temperature.temperature': { $gte: 38, $lt: 40 } },
      [
        { $set: { 'ticket.gatherTicket': 3 } },
        {
          $set: {
            'ticket.groupStudyTicket': {
              $min: [{ $add: ['$ticket.groupStudyTicket', 2] }, 4],
            },
          },
        },
      ],
    );

    // D유형 (≥40)
    await this.UserModel.updateMany(
      { 'temperature.temperature': { $gte: 40 } },
      [
        { $set: { 'ticket.gatherTicket': 4 } },
        {
          $set: {
            'ticket.groupStudyTicket': {
              $min: [{ $add: ['$ticket.groupStudyTicket', 3] }, 4],
            },
          },
        },
      ],
    );
  }

  private mapToDomain(doc: IUser): User {
    const rest = new Rest(
      doc?.rest?.type,
      doc?.rest?.startDate,
      doc?.rest?.endDate,
      doc?.rest?.content,
      doc?.rest?.restCnt,
      doc?.rest?.cumulativeSum,
    );
    const avatar = new Avatar(doc?.avatar?.type, doc?.avatar?.bg);
    const majors = (doc?.majors || []).map(
      (m) => new Major(m?.department, m?.detail),
    );
    const interests = new Interest(
      doc?.interests?.first,
      doc?.interests?.second,
    );
    const locationDetail = new LocationDetail(
      doc?.locationDetail?.text,
      doc?.locationDetail?.lat,
      doc?.locationDetail?.lon,
    );
    const preference = doc.studyPreference
      ? new Preference(
          doc?.studyPreference?.place?.toString(),
          ((doc?.studyPreference?.subPlace || []) as any[]).map((o) =>
            o.toString(),
          ),
        )
      : undefined;
    const ticket = new Ticket(
      doc?.ticket?.gatherTicket,
      doc?.ticket?.groupStudyTicket,
    );
    const badge = doc.badge
      ? new Badge(doc?.badge?.badgeIdx, doc?.badge?.badgeList)
      : undefined;
    const studyRecord = doc.studyRecord
      ? new StudyRecord(
          doc?.studyRecord?.accumulationMinutes,
          doc?.studyRecord?.accumulationCnt,
          doc?.studyRecord?.monthCnt,
          doc?.studyRecord?.monthMinutes,
        )
      : undefined;
    const temperature = new Temperature(
      doc?.temperature?.temperature,
      doc?.temperature?.sum,
      doc?.temperature?.cnt,
    );

    return new User(
      doc?._id?.toString(),
      doc?.uid,
      doc?.name,
      doc?.location,
      doc?.mbti,
      doc?.gender,
      doc?.belong,
      doc?.profileImage,
      doc?.registerDate,
      doc?.isActive,
      doc?.birth,
      doc?.isPrivate,
      doc?.monthStudyTarget,
      doc?.isLocationSharingDenided,
      doc?.role,
      doc?.score,
      doc?.monthScore,
      doc?.point,
      doc?.comment,
      rest || null,
      avatar,
      majors,
      interests,
      doc?.telephone,
      doc?.deposit,
      doc?.friend,
      doc?.like,
      doc?.instagram,
      preference,
      locationDetail,
      ticket,
      badge,
      studyRecord,
      temperature,
      doc?.introduceText,
    );
  }

  private mapToDb(user: User): Partial<IUser> {
    const p = user.toPrimitives();
    return {
      uid: p.uid,
      name: p.name,
      location: p.location,
      mbti: p.mbti,
      gender: p.gender,
      belong: p.belong,
      profileImage: p.profileImage,
      registerDate: p.registerDate,
      isActive: p.isActive,
      birth: p.birth,
      isPrivate: p.isPrivate,
      monthStudyTarget: p.monthStudyTarget,
      isLocationSharingDenided: p.isLocationSharingDenied,
      role: p.role,
      score: p.score,
      monthScore: p.monthScore,
      point: p.point,
      comment: p.comment,
      rest: p.rest,
      avatar: p.avatar,
      majors: p.majors,
      interests: p.interests,
      telephone: p.telephone,
      deposit: p.deposit,
      friend: p.friend,
      like: p.like,
      instagram: p.instagram,
      studyPreference: p.studyPreference,
      locationDetail: p.locationDetail,
      ticket: p.ticket,
      badge: p.badge,
      studyRecord: p.studyRecord,
      temperature: p.temperature,
      introduceText: p.introduceText,
    };
  }
}
