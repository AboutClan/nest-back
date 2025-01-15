import { Inject, Injectable, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { InjectModel } from '@nestjs/mongoose';
import * as CryptoJS from 'crypto-js';
import dayjs from 'dayjs';
import { Request } from 'express';
import { Model } from 'mongoose';
import { JWT } from 'next-auth/jwt';
import { C_simpleUser } from 'src/Constants/constants';
import { AppError } from 'src/errors/AppError';
import { ILog } from 'src/logz/entity/log.entity';
import { INotice } from 'src/notice/entity/notice.entity';
import { IPlace } from 'src/place/entity/place.entity';
import { IPromotion } from 'src/promotion/entity/promotion.entity';
import { IUSER_REPOSITORY } from 'src/utils/di.tokens';
import { getProfile } from 'src/utils/oAuthUtils';
import { IVote } from 'src/vote/entity/vote.entity';
import * as logger from '../logger';
import { IUser, restType } from './entity/user.entity';
import { UserRepository } from './user.repository.interface';
import { IUserService } from './userService.interface';
import { PROMOTION_EVENT_POINT } from 'src/Constants/point';

@Injectable({ scope: Scope.REQUEST })
export class UserService implements IUserService {
  private token: JWT;
  constructor(
    @Inject(IUSER_REPOSITORY)
    private readonly UserRepository: UserRepository,
    @InjectModel('Vote') private Vote: Model<IVote>,
    @InjectModel('Place') private Place: Model<IPlace>,
    @InjectModel('Promotion') private Promotion: Model<IPromotion>,
    @InjectModel('Log') private Log: Model<ILog>,
    @InjectModel('Notice') private Notice: Model<INotice>,
    @Inject(REQUEST) private readonly request: Request, // Request 객체 주입
  ) {
    this.token = this.request.decodedToken;
  }

  async decodeByAES256(encodedTel: string) {
    const key = process.env.cryptoKey;
    if (!key) return encodedTel;

    const bytes = CryptoJS.AES.decrypt(encodedTel, key);
    const originalText = bytes.toString(CryptoJS.enc.Utf8);
    return originalText;
  }

  //User의 정보 중에서 특정 정보만 선택
  createQueryString(strArr: string[]) {
    let result = '';
    strArr.forEach((str) => {
      result += ` ${str}`;
    });

    return result;
  }

  async getUserWithUid(uid: string) {
    const result = await this.UserRepository.findByUid(uid);

    if (result && result.telephone)
      result.telephone = await this.decodeByAES256(result.telephone);

    return result;
  }
  async getUserWithUserId(userId: string) {
    const result = await this.UserRepository.findByUserId(userId);

    if (result && result.telephone)
      result.telephone = await this.decodeByAES256(result.telephone);

    return result;
  }
  async getUsersWithUids(uids: string[]) {
    const results = await this.UserRepository.findByUids(uids);

    for (const result of results) {
      if (result.telephone)
        result.telephone = await this.decodeByAES256(result.telephone);
    }

    return results;
  }

  //유저의 _id도 같이 전송. 유저 로그인 정보 불일치 문제를 클라이언트에서 접속중인 session의 _id와 DB에서 호출해서 가져오는 _id의 일치여부로 판단할 것임
  async getUserInfo(strArr: string[]) {
    let queryString = this.createQueryString(strArr);
    if (strArr.length) queryString = '-_id' + queryString;

    const result = await this.UserRepository.findByUid(
      this.token.uid,
      queryString,
    );

    if (result && result.telephone)
      result.telephone = await this.decodeByAES256(result.telephone);

    return result;
  }

  async getAllUserInfo(strArr: string[]) {
    let queryString = this.createQueryString(strArr);
    if (strArr.length) queryString = '-_id' + queryString;

    const users = await this.UserRepository.findAll(queryString);

    users.forEach(async (user) => {
      if (user.telephone)
        user.telephone = await this.decodeByAES256(user.telephone);
    });

    return users;
  }

  async getSimpleUserInfo() {
    const result = await this.UserRepository.findByUid(
      this.token.uid,
      C_simpleUser,
    );

    return result;
  }

  async getAllSimpleUserInfo() {
    const users = await this.UserRepository.findAll(C_simpleUser);

    return users;
  }

  async updateUser(updateInfo: Partial<IUser>) {
    const updated = await this.UserRepository.updateUser(
      this.token.uid,
      updateInfo,
    );
    return updated;
  }

  //test: test필요
  async getParticipationRate(
    startDay: string,
    endDay: string,
    all: boolean = false,
    location?: string | null,
    summary?: boolean,
  ) {
    try {
      const allUser = all
        ? await this.UserRepository.findByIsActive(
            true,
            C_simpleUser + 'monthScore weekStudyAccumulationMinutes',
          )
        : await this.UserRepository.findByIsActiveUid(
            this.token.uid,
            true,
            C_simpleUser + 'monthScore weekStudyAccumulationMinutes',
          );

      let attendForm = allUser.map((user) => ({
        uid: user.uid,
        cnt: 0,
        userSummary: { ...user.toJSON() },
      }));

      let forParticipation: any[];
      forParticipation = await this.Vote.collection
        .aggregate([
          {
            $match: {
              date: {
                $gte: dayjs(startDay).toDate(),
                $lt: dayjs(endDay).toDate(),
              },
            },
          },
          {
            $unwind: '$participations',
          },
          {
            $project: {
              status: '$participations.status',
              attendences: '$participations.attendences',
            },
          },
          {
            $lookup: {
              from: 'users',
              localField: 'attendences.user',
              foreignField: '_id',
              as: 'attendences.user',
            },
          },
          //open과 free 정보 모두
          {
            $match: {
              $or: [{ status: 'open' }, { status: 'free' }],
            },
          },
          {
            $unwind: '$attendences.user',
          },
          {
            $replaceRoot: {
              newRoot: '$attendences.user',
            },
          },
          {
            $group: {
              _id: '$uid',
              cnt: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: false,
              uid: '$_id',
              cnt: '$cnt',
              location: '$location',
            },
          },
        ])
        .toArray();

      let filtered = forParticipation.filter((who: any) => who.cnt > 0);

      filtered.forEach((obj) => {
        const idx = attendForm.findIndex((user) => user.uid === obj.uid);
        if (attendForm[idx]) attendForm[idx].cnt = obj.cnt;
      });

      if (location) {
        attendForm = attendForm.filter(
          (data) => data.userSummary.location.toString() == location.toString(),
        );
      }
      if (!summary) {
        attendForm.forEach((data) => {
          delete data.userSummary;
        });
      }

      return attendForm.filter((who) => who.cnt > 0);
    } catch (err: any) {
      throw new Error(err);
    }
  }

  async getVoteRate(startDay: string, endDay: string) {
    try {
      const allUser = await this.UserRepository.findByIsActive(true);

      const attendForm = allUser.reduce((accumulator, user) => {
        return { ...accumulator, [user.uid.toString()]: 0 };
      }, {});

      const forVote = await this.Vote.collection
        .aggregate([
          {
            $match: {
              date: {
                $gte: dayjs(startDay).toDate(),
                $lt: dayjs(endDay).toDate(),
              },
            },
          },
          { $unwind: '$participations' },
          { $unwind: '$participations.attendences' },
          {
            $project: {
              attendences: '$participations.attendences',
            },
          },
          {
            $project: {
              firstChoice: '$attendences.firstChoice',
              attendences: '$attendences',
            },
          },
          {
            $lookup: {
              from: 'users',
              localField: 'attendences.user',
              foreignField: '_id',
              as: 'attendences.user',
            },
          },
        ])
        .toArray();

      const voteCnt = forVote
        .flatMap((participation) => participation.attendences)
        .filter((attendence) => attendence.firstChoice === true)
        .flatMap((attendance) => attendance.user)
        .map((user) => user.uid.toString())
        .reduce((acc, val) => {
          if (val in acc) {
            acc[val]++;
          } else {
            acc[val] = 1;
          }
          return acc;
        }, {});

      const voteRateForm = { ...attendForm, ...voteCnt };
      const result = [];

      for (let value in voteRateForm) {
        result.push({ uid: value, cnt: voteRateForm[value] });
      }

      return result;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  async patchStudyTargetHour(hour: number) {
    await this.UserRepository.updateUser(this.token.uid, {
      weekStudyTragetHour: hour,
    });

    return;
  }

  async patchProfile() {
    const profile = await getProfile(
      this.token.accessToken as string,
      this.token.uid as string,
    );
    if (!profile) {
      return new AppError('profile patching failed', 500);
    }

    const updatedUser = await this.UserRepository.updateUser(
      this.token.uid,
      profile,
    );

    return updatedUser;
  }

  async updatePoint(point: number, message: string, sub?: string) {
    await this.UserRepository.increasePoint(point, this.token.uid);

    logger.logger.info(message, {
      type: 'point',
      sub,
      uid: this.token.uid,
      value: point,
    });
    return;
  }

  async updatePointWithUserId(
    userId: string,
    point: number,
    message: string,
    sub?: string,
  ) {
    await this.UserRepository.increasePointWithUserId(point, userId);

    logger.logger.info(message, {
      type: 'point',
      sub,
      uid: this.token.uid,
      value: point,
    });
    return;
  }

  async initMonthScore() {
    await this.UserRepository.initMonthScore();
    return;
  }

  async updateScore(score: number, message: string, sub?: string) {
    await this.UserRepository.increaseScore(score, this.token.uid);

    logger.logger.info(message, {
      type: 'score',
      sub,
      uid: this.token.uid,
      value: score,
    });
    return;
  }

  //todo: mongoose사용
  async updateUserAllScore() {
    try {
      const users = await this.UserRepository.findAll();
      if (!users) throw new Error();

      for (const user of users) {
        if (!user?.score) continue;
        user.score = 0;
        user.point += 20;
        await user.save();
        logger.logger.info('동아리 점수 초기화', {
          type: 'score',
          uid: user.uid,
          value: 0,
        });
        logger.logger.info('동아리 점수 초기화 보상', {
          type: 'point',
          uid: user.uid,
          value: 20,
        });
      }
    } catch (err: any) {
      throw new Error(err);
    }

    return;
  }

  async updateDeposit(deposit: number, message: string, sub?: string) {
    await this.UserRepository.increaseDeposit(deposit, this.token.uid);

    logger.logger.info(message, {
      type: 'deposit',
      sub,
      uid: this.token.uid,
      value: deposit,
    });
    return;
  }

  async setPreference(place: any, subPlace: any[]) {
    try {
      const user = await this.UserRepository.findByUid(
        this.token.uid,
        'studyPreference',
      );

      // 기존 main preference 감소
      if (user?.studyPreference?.place) {
        await this.Place.updateOne(
          { _id: user.studyPreference.place, prefCnt: { $gt: 0 } },
          { $inc: { prefCnt: -1 } },
        );
      }

      // 기존 sub preference 감소
      if (user?.studyPreference?.subPlace?.length) {
        await Promise.all(
          user.studyPreference.subPlace.map((placeId) =>
            this.Place.updateOne(
              { _id: placeId, prefCnt: { $gt: 0 } },
              { $inc: { prefCnt: -1 } },
            ),
          ),
        );
      }

      await Promise.all([
        await this.UserRepository.updateUser(this.token.uid, {
          studyPreference: { place, subPlace },
        }),
        this.Place.updateOne({ _id: place }, { $inc: { prefCnt: 1 } }),
        ...subPlace.map((placeId) =>
          this.Place.updateOne({ _id: placeId }, { $inc: { prefCnt: 1 } }),
        ),
      ]);
    } catch (err: any) {
      throw new Error(err);
    }

    return;
  }

  // studyPreference도 id만 보내는 걸로 변경
  async getPreference() {
    const result = await this.UserRepository.findByUid(
      this.token.uid,
      'studyPreference',
    );
    return result;
  }

  //todo: 필요 없어보임
  async patchRole(role: string) {
    if (
      ![
        'noMember',
        'waiting',
        'human',
        'member',
        'manager',
        'previliged',
        'resting',
        'enthusiastic',
      ].includes(role)
    )
      throw new Error();

    try {
      this.updateUser({ role });
    } catch (err: any) {
      throw new Error(err);
    }
  }

  async setRest(info: Omit<restType, 'restCnt' | 'cumulativeSum'>) {
    try {
      const { startDate, endDate } = info;

      const user = await this.UserRepository.findByUid(this.token.uid);
      if (!user) throw new Error();

      const startDay = dayjs(startDate, 'YYYY-MM-DD');
      const endDay = dayjs(endDate, 'YYYY-MM-DD');
      const dayDiff = endDay.diff(startDay, 'day');

      const result = await this.UserRepository.setRest(
        info,
        this.token.uid,
        dayDiff,
      );

      if (!result) throw new Error('User not found or update failed');
      return result;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  async deleteFriend(toUid: string) {
    await this.UserRepository.deleteFriend(this.token.uid, toUid);
    return null;
  }

  async setFriend(toUid: string) {
    await this.UserRepository.updateFriend(this.token.uid, toUid);

    await this.Notice.create({
      from: this.token.uid,
      to: toUid,
      message: `${this.token.name}님과 친구가 되었습니다.`,
      type: 'friend',
      status: 'response',
    });

    return null;
  }

  async getPromotion() {
    const promotionData = await this.Promotion.find({}, '-_id -__v');
    return promotionData;
  }

  async setPromotion(name: string) {
    try {
      const now = dayjs().format('YYYY-MM-DD');

      // Promotion 컬렉션에서 name에 해당하는 데이터를 업데이트하고, 없으면 새로 생성
      const result = await this.Promotion.updateOne(
        { name },
        {
          $set: { uid: this.token.uid, lastDate: now },
        },
        { upsert: true, new: true },
      );

      // result.upsertedCount가 1이면 새로 생성된 경우, 아니면 업데이트된 경우
      if (result.upsertedCount > 0) {
        await this.updatePoint(PROMOTION_EVENT_POINT, '홍보 이벤트 참여'); // 새로 생성된 경우
      } else {
        const previousData = await this.Promotion.findOne({ name });
        const dayDiff = dayjs(now).diff(dayjs(previousData?.lastDate), 'day');
        if (dayDiff > 2) {
          await this.updatePoint(PROMOTION_EVENT_POINT, '홍보 이벤트 참여'); // 기존 데이터 업데이트
        }
      }
    } catch (err: any) {
      throw new Error(err);
    }
  }

  async patchBelong(uid: string, belong: string) {
    const updated = await this.UserRepository.updateUser(uid, { belong });

    return updated;
  }

  async getMonthScoreLog() {
    // 현재 날짜를 구합니다.
    const currentDate = new Date();

    // 이번 달의 시작일과 마지막 날을 계산합니다.
    const startOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1,
    );
    const endOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0,
    );
    const logs = await this.Log.find(
      {
        'meta.type': 'score',
        'meta.uid': this.token.uid,
        timestamp: {
          $gte: startOfMonth,
          $lte: endOfMonth,
        },
      },
      '-_id timestamp message meta',
    )
      .sort({ timestamp: -1 })
      .limit(30);
    return logs;
  }

  async getLog(type: string) {
    const logs = await this.Log.find(
      {
        'meta.uid': this.token.uid,
        'meta.type': type,
      },
      '-_id timestamp message meta',
    )
      .sort({ timestamp: -1 })
      .limit(30);
    return logs;
  }

  async getAllLog(type: string) {
    const logs = await this.Log.find(
      { 'meta.type': type },
      '-_id timestamp message meta',
    );

    return logs;
  }

  async patchLocationDetail(text: string, lat: string, lon: string) {
    await this.UserRepository.patchLocationDetail(
      this.token.uid,
      text,
      lat,
      lon,
    );

    return;
  }

  async updateAddTicket(type: 'gather' | 'groupOnline' | 'groupOffline') {
    switch (type) {
      case 'gather':
        await this.UserRepository.updateGatherTicket(this.token.uid, 1);
        break;
      case 'groupOffline':
        await this.UserRepository.updateGroupOfflineTicket(this.token.uid, 1);
        break;
      case 'groupOnline':
        await this.UserRepository.updateGroupOnlineTicket(this.token.uid, 1);
        break;
      default:
        break;
    }
  }
  async updateReduceTicket(type: 'gather' | 'groupOnline' | 'groupOffline') {
    switch (type) {
      case 'gather':
        await this.UserRepository.updateGatherTicket(this.token.uid, -1);
        break;
      case 'groupOffline':
        await this.UserRepository.updateGroupOfflineTicket(this.token.uid, -1);
        break;
      case 'groupOnline':
        await this.UserRepository.updateGroupOnlineTicket(this.token.uid, -1);
        break;
      default:
        break;
    }
  }

  async resetGatherTicket() {
    await this.UserRepository.resetGatherTicket(this.token.uid);
  }

  async getTicketInfo(userId: string) {
    await this.UserRepository.getTicketInfo(userId);
  }

  async test() {
    return await this.UserRepository.getTicketInfo(this.token.uid);
  }
}
