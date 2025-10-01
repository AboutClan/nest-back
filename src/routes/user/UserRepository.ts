import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { Avatar } from 'src/domain/entities/User/Avatar';
import { Badge } from 'src/domain/entities/User/Badge';
import { Interest } from 'src/domain/entities/User/Interest';
import { LocationDetail } from 'src/domain/entities/User/Location';
import { Major } from 'src/domain/entities/User/Major';
import { Preference } from 'src/domain/entities/User/Preference';
import { Rest } from 'src/domain/entities/User/Rest';
import { StudyRecord } from 'src/domain/entities/User/StudyRecord';
import { Temperature } from 'src/domain/entities/User/Temperature';
import { Ticket } from 'src/domain/entities/User/Ticket';
import { User } from 'src/domain/entities/User/User';
import { IUser } from './user.entity';
import { IUserRepository } from './UserRepository.interface';

export class UserRepository implements IUserRepository {
  constructor(
    @InjectModel(DB_SCHEMA.USER) private readonly UserModel: Model<IUser>,
  ) {}

  async findById(userId: string): Promise<User> {
    const user = await this.UserModel.findById(userId);
    if (!user) return null;
    return this.mapToDomain(user);
  }

  async updateUser(uid: string, updateInfo: any): Promise<null> {
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

  async resetTemperature(): Promise<null> {
    await this.UserModel.updateMany(
      {},
      {
        $set: {
          'temperature.temperature': 36.5,
          'temperature.sum': 0,
          'temperature.cnt': 0,
        },
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

  async updateLocationDetailAll(id: string, location: any) {
    await this.UserModel.updateOne(
      { _id: id },
      { $set: { locationDetail: location } },
    );
  }

  async processMonthScore() {
    await this.UserModel.aggregate([
      {
        $addFields: {
          tier: {
            $switch: {
              branches: [
                { case: { $gte: ['$monthScore', 30] }, then: 'gold' },
                { case: { $gt: ['$monthScore', 10] }, then: 'silver' },
              ],
              default: 'bronze',
            },
          },
        },
      },
      {
        $setWindowFields: {
          partitionBy: '$tier',
          sortBy: { monthScore: -1 },
          output: {
            rankPosition: { $rank: {} },
          },
        },
      },
      {
        $project: { _id: 1, rank: '$tier', rankPosition: 1 },
      },
      {
        $merge: {
          into: 'users',
          whenMatched: 'merge',
          whenNotMatched: 'discard',
        },
      },
    ]);
  }

  async findMonthPrize(ranks: any[]) {
    const result = {};

    for (const rank of ranks) {
      //role is not previliged and manager
      result[rank] = await this.UserModel.find({
        rank: rank,
        role: { $nin: ['previliged', 'manager', 'admin', 'resting'] },
      })
        .sort({ monthScore: -1 })
        .limit(5)
        .lean();
    }

    return result;
  }

  async resetMonthScore() {
    await this.UserModel.updateMany({}, { monthScore: 0 });
  }

  async processTicket(whiteList: any) {
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

    await this.UserModel.updateMany(
      { 'temperature.temperature': { $gte: 40, $lt: 42 } },
      [
        { $set: { 'ticket.gatherTicket': 3 } },
        {
          $set: {
            'ticket.groupStudyTicket': 5,
          },
        },
      ],
    );

    await this.UserModel.updateMany(
      { 'temperature.temperature': { $gte: 42 } },
      [
        { $set: { 'ticket.gatherTicket': 4 } },
        {
          $set: {
            'ticket.groupStudyTicket': 6,
          },
        },
      ],
    );

    //여성: gather 1, group 2장 추가
    await this.UserModel.updateMany(
      { gender: '여성' },
      {
        $inc: {
          'ticket.gatherTicket': 1,
          'ticket.groupStudyTicket': 2,
        },
      },
    );

    for (const item of whiteList) {
      await this.UserModel.updateMany(
        { uid: item.uid },
        { $set: { 'ticket.gatherTicket': 4 } },
        {
          $inc: {
            'ticket.gatherTicket': item.gatherTicket,
            'ticket.groupStudyTicket': item.groupStudyTicket,
          },
        },
      );
    }
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
      doc?.locationDetail?.name,
      doc?.locationDetail?.address,
      doc?.locationDetail?.latitude,
      doc?.locationDetail?.longitude,
    );
    const preference = doc.studyPreference
      ? new Preference(
          doc?.studyPreference?.place?.toString(),
          ((doc?.studyPreference?.subPlace || []) as any[]).map((o) =>
            o.toString(),
          ),
        )
      : null;
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
      doc?.temperature?.blockCnt,
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
      doc?.rank,
      doc?.rankPosition,
    );
  }

  private mapToDb(user: User): Partial<IUser> {
    const p = user.toPrimitives();

    const result: any = {};

    if (p.uid !== null) result.uid = p.uid;
    if (p.name !== null) result.name = p.name || '';
    if (p.location !== null) result.location = p.location || '';
    if (p.mbti !== null) result.mbti = p.mbti || '';
    if (p.gender !== null) result.gender = p.gender || '';
    if (p.belong !== null) result.belong = p.belong || '';
    if (p.profileImage !== null) result.profileImage = p.profileImage || '';
    if (p.registerDate !== null) result.registerDate = p.registerDate;
    if (p.isActive !== null) result.isActive = p.isActive ?? true;
    if (p.birth !== null) result.birth = p.birth;
    if (p.isPrivate !== null) result.isPrivate = p.isPrivate ?? false;
    if (p.monthStudyTarget !== null)
      result.monthStudyTarget = p.monthStudyTarget || 0;
    if (p.isLocationSharingDenied !== null)
      result.isLocationSharingDenided = p.isLocationSharingDenied ?? false;
    if (p.role !== null) result.role = p.role || 'user';
    if (p.score !== null) result.score = p.score || 0;
    if (p.monthScore !== null) result.monthScore = p.monthScore || 0;
    if (p.point !== null) result.point = p.point || 0;
    if (p.comment !== null) result.comment = p.comment || '';
    if (p.rest !== null) result.rest = p.rest || {};
    if (p.avatar !== null) result.avatar = p.avatar || {};
    if (p.majors !== null) result.majors = p.majors || [];
    if (p.interests !== null) result.interests = p.interests || {};
    if (p.telephone !== null) result.telephone = p.telephone || '';
    if (p.deposit !== null) result.deposit = p.deposit || 0;
    if (p.friend !== null) result.friend = p.friend || [];
    if (p.like !== null) result.like = p.like || 0;
    if (p.instagram !== null) result.instagram = p.instagram || '';
    if (p.studyPreference !== null)
      result.studyPreference = p.studyPreference || {};
    if (p.locationDetail !== null)
      result.locationDetail = p.locationDetail || {};
    if (p.ticket !== null) result.ticket = p.ticket || [];
    if (p.badge !== null) result.badge = p.badge || [];
    if (p.studyRecord !== null) result.studyRecord = p.studyRecord || [];
    if (p.temperature !== null) result.temperature = p.temperature || 0;
    if (p.introduceText !== null) result.introduceText = p.introduceText || '';
    if (p.rank !== null) result.rank = p.rank;
    if (p.rankPosition !== null) result.rankPosition = p.rankPosition;

    if (result.studyPreference?.place?.length === 0)
      result.studyPreference.place = null;

    return result;
  }
}
