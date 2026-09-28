import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { Avatar } from 'src/MSA/User/core/domain/User/Avatar';
import { Badge } from 'src/MSA/User/core/domain/User/Badge';
import { Interest } from 'src/MSA/User/core/domain/User/Interest';
import { LocationDetail } from 'src/MSA/User/core/domain/User/Location';
import { Major } from 'src/MSA/User/core/domain/User/Major';
import { Preference } from 'src/MSA/User/core/domain/User/Preference';
import { Rest } from 'src/MSA/User/core/domain/User/Rest';
import { StudyRecord } from 'src/MSA/User/core/domain/User/StudyRecord';
import { Temperature } from 'src/MSA/User/core/domain/User/Temperature';
import { Ticket } from 'src/MSA/User/core/domain/User/Ticket';
import { User } from 'src/MSA/User/core/domain/User/User';
import { IUserRepository } from '../core/interfaces/UserRepository.interface';
import {
  IUser,
  notificationConsentType,
  parseStudyIntroduce,
} from '../entity/user.entity';

export class UserRepository implements IUserRepository {
  constructor(
    @InjectModel(DB_SCHEMA.USER) private readonly UserModel: Model<IUser>,
  ) {}

  async findById(userId: string): Promise<User> {
    const user = await this.UserModel.findById(userId);
    if (!user) return null;
    return this.mapToDomain(user);
  }

  /**
   * 스터디 신청 독려 푸시(매주 목 20:00) 대상 — 스터디에 한 번이라도 참여한 사람.
   *
   * 예전에는 `accumulationMinutes >= 2` 조건도 함께 봤다. 그 필드가 원래
   * solo 인증 횟수를 담고 있어서(분 필드에 횟수가 들어가는 버그) "개인 인증 2회 이상"을
   * 뜻했는데, 필드 의미를 바로잡은 뒤로는 "2분 이상 공부"가 되어 사실상 전체 유저가
   * 걸렸다. 누적 참여 횟수만 본다.
   */
  async findAllForStudyEngage() {
    return await this.UserModel.find({
      'studyRecord.accumulationCnt': { $gte: 1 },
      'notificationConsent.cafe': true,
    })
      .select('_id uid studyRecord')
      .lean();
  }

  async findAllForGatherNotification() {
    return await this.UserModel.find({
      'notificationConsent.gather': true,
    })
      .select('_id uid')
      .lean();
  }

  async updateUser(uid: string, updateInfo: any): Promise<null> {
    await this.UserModel.findOneAndUpdate(
      { uid },
      { $set: updateInfo },
      { new: true, upsert: false },
    );
    return null;
  }

  async updateGatherTicket(
    userId: string,
    value: number,
  ): Promise<number | null> {
    const updatedUser = await this.UserModel.findOneAndUpdate(
      {
        _id: userId,
      },
      {
        $inc: { 'ticket.gatherTicket': value },
      },
      { new: true, upsert: false },
    );
    return updatedUser?.ticket?.gatherTicket ?? null;
  }
  async updateGroupStudyTicket(
    userId: string,
    value: number,
  ): Promise<number | null> {
    const updatedUser = await this.UserModel.findOneAndUpdate(
      {
        _id: userId,
      },
      {
        $inc: { 'ticket.groupStudyTicket': value },
      },
      { new: true, upsert: false },
    );
    return updatedUser?.ticket?.groupStudyTicket ?? null;
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

  async resetPointByMonthScore(maxDate: string) {
    const uids = await this.UserModel.find(
      {
        monthScore: { $lt: 2 },
        role: { $ne: 'resting' },
        registerDate: { $lt: maxDate },
      },
      'uid',
    );

    await this.UserModel.updateMany(
      {
        monthScore: { $lt: 5 },
        role: { $ne: 'resting' },
        registerDate: { $lt: maxDate },
      },
      [
        {
          $set: {
            point: { $max: [{ $subtract: ['$point', 1000] }, 0] },
          },
        },
      ],
    );

    return uids.map((user) => user.uid);
  }

  async updateLocationDetailAll() {
    await this.UserModel.updateMany(
      {
        registerDate: { $gte: '2025-11-01' }, // 포함 이후
      },
      {
        $set: {
          membership: 'newbie',
        },
      },
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

  /**
   * 스터디 챌린지 배지 지급. 도메인 User를 거치지 않고 $inc로만 다룬다.
   * lastAt은 동점자 정렬용이라 지급할 때마다 갱신한다.
   */
  async incrementStudyBadge(userId: string, count = 1) {
    await this.UserModel.updateOne(
      { _id: userId },
      {
        $inc: { 'studyBadge.monthCnt': count },
        $set: { 'studyBadge.lastAt': new Date() },
      },
    );
  }

  /**
   * 스터디 배지 랭킹. 배지 수 내림차순, 같으면 먼저 달성한 사람이 상위.
   * lastAt이 없는(옛 데이터) 경우는 뒤로 밀린다.
   */
  async findStudyBadgeRanking(limit: number) {
    return await this.UserModel.find({ 'studyBadge.monthCnt': { $gt: 0 } })
      // 프론트 Avatar가 avatar·role까지 읽으므로 함께 내려준다.
      .select('_id uid name profileImage avatar role studyBadge')
      .sort({ 'studyBadge.monthCnt': -1, 'studyBadge.lastAt': 1 })
      .limit(limit)
      .lean();
  }

  /**
   * 내 배지 현황. findByUid는 도메인 User로 매핑해 돌려주는데 studyBadge는
   * 도메인에 없는 필드라 그 경로로는 읽을 수 없다(항상 undefined).
   */
  async findStudyBadgeByUid(uid: string) {
    const user = await this.UserModel.findOne({ uid })
      .select('studyBadge')
      .lean();

    return {
      monthCnt: (user as any)?.studyBadge?.monthCnt ?? 0,
      lastAt: (user as any)?.studyBadge?.lastAt ?? null,
    };
  }

  /** 나보다 상위인 사람 수. 내 순위는 여기에 1을 더한 값이다. */
  async countStudyBadgeAbove(monthCnt: number, lastAt: Date | null) {
    return await this.UserModel.countDocuments({
      $or: [
        { 'studyBadge.monthCnt': { $gt: monthCnt } },
        {
          'studyBadge.monthCnt': monthCnt,
          'studyBadge.lastAt': { $lt: lastAt ?? new Date() },
        },
      ],
    });
  }

  /** 매월 1일 정산 후 초기화. lastAt도 비워 다음 달 동점 정렬이 섞이지 않게 한다. */
  async resetStudyBadge() {
    await this.UserModel.updateMany(
      {},
      { $set: { 'studyBadge.monthCnt': 0, 'studyBadge.lastAt': null } },
    );
  }

  /**
   * 월간 공부 기록 초기화. monthScore와 같은 시점(매월 1일)에 돌린다.
   * 이게 없어서 "월간" 참여 횟수·공부 시간이 계속 누적되고 있었다.
   */
  async resetMonthStudyRecord() {
    await this.UserModel.updateMany(
      {},
      { 'studyRecord.monthCnt': 0, 'studyRecord.monthMinutes': 0 },
    );
  }

  async test(): Promise<any> {
    await this.UserModel.updateMany(
      { point: { $lte: 0 } },
      { $set: { point: 0 } },
    );
  }

  async findAllForTicket() {
    return await this.UserModel.find({})
      .select('_id uid ticket temperature')
      .lean();
  }

  async initMembership(): Promise<null> {
    //registerDate가 오늘 기준 한달 이전인 경우 membership을 normal로 변경
    const today = new Date();
    const oneMonthAgo = new Date(today.setMonth(today.getMonth() - 1));
    await this.UserModel.updateMany(
      { registerDate: { $lt: oneMonthAgo }, membership: 'newbie' },
      { $set: { membership: 'normal' } },
    );
    return null;
  }

  async processTicket(whiteList: any) {
    // A유형 (<36.5)
    await this.UserModel.updateMany(
      { 'temperature.temperature': { $lt: 36.5 } },
      [
        { $set: { 'ticket.gatherTicket': 1 } },
        {
          $set: {
            'ticket.groupStudyTicket': 2,
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
            'ticket.groupStudyTicket': 4,
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
            'ticket.groupStudyTicket': 4,
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
      { 'temperature.temperature': { $gte: 42, $lt: 44 } },
      [
        { $set: { 'ticket.gatherTicket': 4 } },
        {
          $set: {
            'ticket.groupStudyTicket': 5,
          },
        },
      ],
    );

    await this.UserModel.updateMany(
      { 'temperature.temperature': { $gte: 44 } },
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
          'ticket.groupStudyTicket': 1,
        },
      },
    );

    /** set과 inc 같이 적용 안된다고 해서 확인해 주세요! */
    // for (const item of whiteList) {
    //   await this.UserModel.updateMany(
    //     { uid: item.uid },
    //     { $set: { 'ticket.gatherTicket': 4 } },
    //     {
    //       $inc: {
    //         'ticket.gatherTicket': item.gatherTicket,
    //         'ticket.groupStudyTicket': item.groupStudyTicket,
    //       },
    //     },
    //   );
    // }

    //membership이 뉴비면 번개 +1, 소모임 +2 / 운영진/소모임장이면 번개 +2 소모임 +4 / 번개 서포터즈면 번개 +2
    await this.UserModel.updateMany(
      { membership: 'newbie' },
      {
        $inc: {
          'ticket.gatherTicket': 1,
          'ticket.groupStudyTicket': 2,
        },
      },
    );
    await this.UserModel.updateMany(
      { membership: 'manager' },
      {
        $inc: {
          'ticket.gatherTicket': 2,
          'ticket.groupStudyTicket': 4,
        },
      },
    );
    await this.UserModel.updateMany(
      { membership: 'gatherSupporters' },
      {
        $inc: {
          'ticket.gatherTicket': 2,
        },
      },
    );
    return null;
  }

  /**
   * point를 원자적으로 delta만큼 증감시키되 0 밑으로는 내려가지 않도록 클램프한다.
   * read → mutate → save 방식(전체 문서 덮어쓰기)과 달리 동시 호출 간 lost update가 없다.
   */
  async incrementPointByUid(uid: string, delta: number): Promise<void> {
    await this.UserModel.updateOne({ uid }, [
      {
        $set: {
          point: { $max: [{ $add: ['$point', delta] }, 0] },
        },
      },
    ]);
  }

  async incrementPointByUserId(userId: string, delta: number): Promise<void> {
    await this.UserModel.updateOne({ _id: userId }, [
      {
        $set: {
          point: { $max: [{ $add: ['$point', delta] }, 0] },
        },
      },
    ]);
  }

  async resetNegativePoint(): Promise<void> {
    await this.UserModel.updateMany(
      { point: { $lt: 0 } },
      { $set: { point: 0 } },
    );
  }

  async findUsersWithNegativeGroupStudyTicket(): Promise<User[]> {
    const users = await this.UserModel.find({
      'ticket.groupStudyTicket': { $lt: 0 },
    });
    return users.map((user) => this.mapToDomain(user));
  }

  async findAllNicknames(): Promise<string[]> {
    return this.UserModel.distinct('nickname', {
      nickname: { $exists: true, $nin: [null, ''] },
    });
  }

  async findAllForPrize() {
    return await this.UserModel.find({
      rank: { $nin: ['previliged', 'manager', 'admin', 'resting'] },
      'temperature.temperature': { $gte: 36.5 },
      weekStudyTragetHour: { $gt: 0 },
      weekStudyAccumulationMinutes: { $gt: 0 },
    })
      .select('_id uid rank monthScore temperature  studyRecord')
      .lean();
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

    const notificationConsent: notificationConsentType = {
      cafe: doc?.notificationConsent?.cafe ?? false,
      gather: doc?.notificationConsent?.gather ?? false,
    };

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
      doc?.membership,
      doc?.randomTicket,
      parseStudyIntroduce(doc?.studyIntroduce),
      notificationConsent,
      doc?.nickname,
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
    if (p.isActive !== null) result.isActive = p.isActive ?? false;
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
    if (p.nickname !== null) result.nickname = p.nickname;

    if (result.studyPreference?.place?.length === 0)
      result.studyPreference.place = null;
    if (p.membership !== null) result.membership = p.membership;
    if (p.randomTicket !== null) result.randomTicket = p.randomTicket;
    if (p.studyIntroduce !== null)
      result.studyIntroduce = parseStudyIntroduce(p.studyIntroduce);
    if (p.notificationConsent !== null)
      result.notificationConsent = p.notificationConsent;
    return result;
  }
}
