import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { IUser } from './user.entity';
import { UserRepository } from './user.repository.interface';

export class MongoUserRepository implements UserRepository {
  constructor(
    @InjectModel(DB_SCHEMA.USER) private readonly User: Model<IUser>,
  ) {}

  async initTemperature() {
    await this.User.updateMany(
      {},
      {
        $set: {
          'temperature.temperature': 36.5,
          'temperature.sum': 0,
          'temperature.cnt': 0,
        },
      },
    );
    return null;
  }

  async findById(userId: string): Promise<IUser> {
    return await this.User.findById(userId);
  }

  async findByUid(uid: string, queryString?: string): Promise<IUser> {
    return queryString
      ? await this.User.findOne({ uid }, queryString)
      : await this.User.findOne({ uid });
  }
  async findByUserId(userId: string): Promise<IUser> {
    return await this.User.findOne({ _id: userId });
  }
  async findByUids(uids: string[]): Promise<IUser[]> {
    return await this.User.find({ uid: { $in: uids } });
  }
  async findAll(queryString?: string): Promise<IUser[]> {
    return queryString
      ? await this.User.find({}, queryString)
      : await this.User.find();
  }
  async updateUser(uid: string, updateInfo: any): Promise<null> {
    await this.User.findOneAndUpdate(
      { uid },
      { $set: updateInfo },
      { new: true, upsert: false },
    );
    return null;
  }

  async updateUserById(id: string, updateInfo: any): Promise<null> {
    await this.User.findOneAndUpdate(
      { _id: id },
      { $set: updateInfo },
      { new: true, upsert: false },
    );
    return null;
  }

  async initMonthScore(): Promise<null> {
    await this.User.updateMany({}, { $set: { monthScore: 0 } });
    return null;
  }

  async findByLocation(location: string): Promise<IUser[]> {
    return await this.User.find({ location });
  }

  async findByIsActive(
    isActive: boolean,
    queryString?: string,
  ): Promise<IUser[]> {
    return queryString
      ? await this.User.find({ isActive }, queryString)
      : await this.User.find({ isActive });
  }
  async findByIsActiveUid(
    uid: string,
    isActive: boolean,
    queryString?: string,
  ): Promise<IUser[]> {
    return await this.User.find({ uid, isActive }, queryString);
  }
  async increasePoint(point: number, uid: string): Promise<null> {
    await this.User.findOneAndUpdate(
      { uid }, // 검색 조건
      { $inc: { point: point } }, // point 필드 값을 증가
      { new: true, useFindAndModify: false }, // 업데이트 후의 최신 문서를 반환
    );

    return null;
  }
  async increasePointWithUserId(point: number, userId: string): Promise<null> {
    await this.User.findOneAndUpdate(
      { _id: userId }, // 검색 조건
      { $inc: { point: point } }, // point 필드 값을 증가
      { new: true, useFindAndModify: false }, // 업데이트 후의 최신 문서를 반환
    );

    return null;
  }
  async increaseScoreWithUserId(score: number, userId: string): Promise<null> {
    await this.User.findOneAndUpdate(
      { _id: userId }, // 검색 조건
      { $inc: { score } }, // point 필드 값을 증가
      { new: true, useFindAndModify: false }, // 업데이트 후의 최신 문서를 반환
    );

    return null;
  }

  async patchLocationDetail(
    uid: string,
    text: string,
    lat: string,
    lon: string,
  ) {
    await this.User.updateOne({ uid }, { locationDetail: { text, lat, lon } });
  }

  async increaseTemperature(
    temperature: number,
    score: number,
    cnt: number,
    uid: string,
  ): Promise<null> {
    return await this.User.findOneAndUpdate(
      { uid },
      {
        $set: {
          'temperature.sum': score,
          'temperature.cnt': cnt,
          'temperature.temperature': 36.5 + temperature,
        },
      },
      { new: true, useFindAndModify: false },
    );
  }
  async increaseScore(score: number, uid: string): Promise<null> {
    return await this.User.findOneAndUpdate(
      { uid }, // 검색 조건
      { $inc: { score: score, monthScore: score } },
      { new: true, useFindAndModify: false },
    );
  }
  async increaseDeposit(deposit: number, uid: string): Promise<null> {
    return await this.User.findOneAndUpdate(
      { uid },
      { $inc: { deposit } },
      { new: true, useFindAndModify: false },
    );
  }
  async setRest(info: any, uid: string, dayDiff: any): Promise<IUser> {
    const user = await this.User.findOneAndUpdate(
      { uid },
      {
        $set: {
          'rest.type': info.type,
          'rest.content': info.content,
          'rest.startDate': info.startDate,
          'rest.endDate': info.endDate,
          role: 'resting',
        },
        $inc: { 'rest.restCnt': 1, 'rest.cumulativeSum': dayDiff }, // restCnt와 cumulativeSum 증가
      },
      {
        upsert: true,
        new: true,
      },
    );
    return user;
  }
  async updatePreference(
    uid: string,
    place: any,
    subPlace: any[],
  ): Promise<null> {
    await this.User.updateOne(
      { uid },
      { studyPreference: { place, subPlace } },
    );
    return null;
  }
  async deleteFriend(uid: string, toUid: string): Promise<null> {
    await this.User.findOneAndUpdate({ uid }, { $pull: { friend: toUid } });
    await this.User.findOneAndUpdate(
      { uid: toUid },
      { $pull: { friend: uid } },
    );

    return null;
  }
  async updateFriend(uid: string, toUid: string): Promise<null> {
    await this.User.findOneAndUpdate(
      { uid },
      { $addToSet: { friend: toUid } },
      { upsert: true },
    );
    await this.User.findOneAndUpdate(
      { uid: toUid },
      { $addToSet: { friend: uid } },
      { upsert: true },
    );

    return null;
  }
  async updateBelong(uid: string, belong: string): Promise<null> {
    await this.User.findOneAndUpdate(
      { uid },
      { belong },
      { new: true, upsert: false },
    );

    return null;
  }

  async updateGatherTicket(userId: string, value: number) {
    await this.User.findOneAndUpdate(
      {
        _id: userId,
      },
      {
        $inc: { 'ticket.gatherTicket': value },
      },
      { new: true, upsert: false },
    );
    return null;
  }
  async updateGroupStudyTicket(userId: string, value: number) {
    await this.User.findOneAndUpdate(
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

  async resetGatherTicket() {
    await this.User.findOneAndUpdate(
      { 'ticket.gatherTicket': { $lt: 3 } },
      {
        $set: { 'ticket.gatherTicket': 3 },
      },
      { new: true, upsert: false },
    );
  }
  async getTicketInfo(userId: string) {
    return this.User.findOne({ _id: userId }, 'ticket');
  }
  async addbadge(id: string, badgeName: string) {
    await this.User.findOneAndUpdate(
      { _id: id },
      { $addToSet: { 'badge.badgeList': badgeName } },
    );
  }

  async selectbadge(uid: string, badgeIdx: number) {
    await this.User.findOneAndUpdate(
      { uid },
      { $set: { 'badge.badgeIdx': badgeIdx } },
    );
  }

  //잘못실행되지 않도록 막아야함
  async resetPointByMonthScore(maxDate: string) {
    const users = await this.User.find(
      {
        monthScore: { $lte: 10 },
        role: { $ne: 'resting' },
        registerDate: { $lt: maxDate },
      },
      'uid',
    );

    await this.User.updateMany(
      {
        monthScore: { $lte: 10 },
        role: { $ne: 'resting' },
        registerDate: { $lt: maxDate },
      },
      { $inc: { point: -1000 } },
    );

    return users.map((user) => user.uid);
  }

  async updateTicketWithUserIds(userIds: string[], ticketNum: number) {
    await this.User.updateMany(
      { _id: { $in: userIds } },
      { $inc: { 'ticket.groupStudyTicket': ticketNum } },
    );
  }

  async resetMonthScore() {
    await this.User.updateMany({}, { monthScore: 0 });
  }

  async getBadgeList(uid: string) {
    return (await this.User.findOne({ uid }, '-_id badge')).badge.badgeList;
  }

  async updateAllUserInfo() {}

  async processTicket() {
    // A유형 (<36.5)
    await this.User.updateMany({ 'temperature.temperature': { $lt: 36.5 } }, [
      { $set: { 'ticket.gatherTicket': 1 } },
      {
        $set: {
          'ticket.groupStudyTicket': 2,
        },
      },
    ]);

    // B유형 (36.5 ≤ t < 38)
    await this.User.updateMany(
      { 'temperature.temperature': { $gte: 36.5, $lt: 38 } },
      [
        { $set: { 'ticket.gatherTicket': 2 } },
        {
          $set: {
            'ticket.groupStudyTicket': 3,
          },
        },
      ],
    );

    // C유형 (38 ≤ t < 40)
    await this.User.updateMany(
      { 'temperature.temperature': { $gte: 38, $lt: 40 } },
      [
        { $set: { 'ticket.gatherTicket': 2 } },
        {
          $set: {
            'ticket.groupStudyTicket': 4,
          },
        },
      ],
    );
    await this.User.updateMany(
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

    await this.User.updateMany({ 'temperature.temperature': { $gte: 42 } }, [
      { $set: { 'ticket.gatherTicket': 4 } },
      {
        $set: {
          'ticket.groupStudyTicket': 6,
        },
      },
    ]);
  }

  async test() {
    await this.User.updateOne(
      { uid: '1234' },
      {
        $unset: {
          email: true,
          emailVerified: true,
          kakao_account: true,
          properties: true,
          connected_at: true,
        },
      },
      { strict: false },
    );
  }
}
