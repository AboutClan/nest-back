import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IUser } from './entity/user.entity';
import { UserRepository } from './user.repository.interface';

export class MongoUserRepository implements UserRepository {
  constructor(@InjectModel('User') private readonly User: Model<IUser>) {}

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

  async patchLocationDetail(
    uid: string,
    text: string,
    lat: string,
    lon: string,
  ) {
    await this.User.updateOne({ uid }, { locationDetail: { text, lat, lon } });
  }

  async increaseScore(score: number, uid: string): Promise<null> {
    return await this.User.findOneAndUpdate(
      { uid }, // 검색 조건
      { $inc: { score: score, monthScore: score } }, // score와 monthScore 필드를 동시에 증가
      { new: true, useFindAndModify: false }, // 업데이트 후의 최신 문서를 반환
    );
  }
  async increaseDeposit(deposit: number, uid: string): Promise<null> {
    return await this.User.findOneAndUpdate(
      { uid }, // 검색 조건
      { $inc: { deposit } }, // deposit 필드를 증가
      { new: true, useFindAndModify: false }, // 업데이트 후의 최신 문서를 반환
    );
  }
  async setRest(info: any, uid: string, dayDiff: any): Promise<IUser> {
    await this.User.findOneAndUpdate(
      { uid }, // 사용자를 uid로 찾음
      {
        $set: {
          'rest.type': info.type,
          'rest.content': info.content,
          'rest.startDate': info.startDate,
          'rest.endDate': info.endDate,
        },
        $inc: { 'rest.restCnt': 1, 'rest.cumulativeSum': dayDiff }, // restCnt와 cumulativeSum 증가
      },
      {
        upsert: true, // rest 필드가 없는 경우 생성
        new: true, // 업데이트된 값을 반환
      },
    );
    return null;
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
  async updateGroupOnlineTicket(userId: string, value: number) {
    console.log(3);
    console.log(userId);
    await this.User.findOneAndUpdate(
      {
        _id: userId,
      },
      {
        $inc: { 'ticket.groupStudyOnlineTicket': value },
      },
      { new: true, upsert: false },
    );
    return null;
  }
  async updateGroupOfflineTicket(userId: string, value: number) {
    await this.User.findOneAndUpdate(
      {
        _id: userId,
      },
      {
        $inc: { 'ticket.groupStudyOfflineTicket': value },
      },
      { new: true, upsert: false },
    );
    return null;
  }

  async resetGatherTicket(uid: string) {
    await this.User.findOneAndUpdate(
      {
        uid,
      },
      {
        $set: { 'ticket.gatherTicket': 4 },
      },
      { new: true, upsert: false },
    );
  }
  async getTicketInfo(userId: string) {
    return this.User.findOne({ _id: userId }, 'ticket');
  }
  async addbadge(uid: string, badgeIdx: number) {
    await this.User.findOneAndUpdate(
      { uid },
      { $addToSet: { 'badge.badgeList': badgeIdx } },
    );
  }

  async selectbadge(uid: string, badgeIdx: number) {
    await this.User.findOneAndUpdate(
      { uid },
      { $set: { 'badge.badgeIdx': badgeIdx } },
    );
  }

  async getBadgeList(uid: string) {
    return (await this.User.findOne({ uid }, '-_id badge')).badge.badgeList;
  }
}
