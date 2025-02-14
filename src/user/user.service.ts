import { Inject, Injectable, Scope } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as CryptoJS from 'crypto-js';
import dayjs from 'dayjs';
import { Model } from 'mongoose';
import { AppError } from 'src/errors/AppError';
import { ILog } from 'src/logz/log.entity';
import { IUSER_REPOSITORY } from 'src/utils/di.tokens';
import { getProfile } from 'src/utils/oAuthUtils';
import { IVote } from 'src/vote/vote.entity';
import * as logger from '../logger';
import { IUser, restType } from './user.entity';
import { UserRepository } from './user.repository.interface';
import { C_simpleUser } from 'src/Constants/constants';
import ImageService from 'src/imagez/image.service';
import NoticeService from 'src/notice/notice.service';
import PlaceService from 'src/place/place.service';
import { RequestContext } from 'src/request-context';

@Injectable({ scope: Scope.REQUEST })
export class UserService {
  constructor(
    @Inject(IUSER_REPOSITORY)
    private readonly UserRepository: UserRepository,
    @InjectModel('Vote') private Vote: Model<IVote>,
    @InjectModel('Log') private Log: Model<ILog>,
    private readonly noticeService: NoticeService,
    private placeService: PlaceService,
    private readonly imageServiceInstance: ImageService,
  ) {}

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
    const token = RequestContext.getDecodedToken();
    let queryString = this.createQueryString(strArr);
    if (strArr.length) queryString = '-_id' + queryString;

    const result = await this.UserRepository.findByUid(token.uid, queryString);

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
    const token = RequestContext.getDecodedToken();
    const result = await this.UserRepository.findByUid(token.uid, C_simpleUser);

    return result;
  }

  async getAllSimpleUserInfo() {
    const users = await this.UserRepository.findAll(C_simpleUser);

    return users;
  }

  async updateUser(updateInfo: Partial<IUser>) {
    const token = RequestContext.getDecodedToken();
    const updated = await this.UserRepository.updateUser(token.uid, updateInfo);
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
    const token = RequestContext.getDecodedToken();
    try {
      const allUser = all
        ? await this.UserRepository.findByIsActive(
            true,
            C_simpleUser + 'monthScore weekStudyAccumulationMinutes',
          )
        : await this.UserRepository.findByIsActiveUid(
            token.uid,
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
    const token = RequestContext.getDecodedToken();
    await this.UserRepository.updateUser(token.uid, {
      weekStudyTragetHour: hour,
    });

    return;
  }

  async patchProfile() {
    const token = RequestContext.getDecodedToken();
    const profile = await getProfile(
      token.accessToken as string,
      token.uid as string,
    );
    if (!profile) {
      return new AppError('profile patching failed', 500);
    }

    const updatedUser = await this.UserRepository.updateUser(
      token.uid,
      profile,
    );

    return updatedUser;
  }

  async updatePoint(point: number, message: string, sub?: string) {
    const token = RequestContext.getDecodedToken();

    await this.UserRepository.increasePoint(point, token.uid);

    logger.logger.info(message, {
      type: 'point',
      sub,
      uid: token.uid,
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
    const token = RequestContext.getDecodedToken();

    await this.UserRepository.increasePointWithUserId(point, userId);

    logger.logger.info(message, {
      type: 'point',
      sub,
      uid: token.uid,
      value: point,
    });
    return;
  }

  async initMonthScore() {
    await this.UserRepository.initMonthScore();
    return;
  }

  async updateScore(score: number, message: string, sub?: string) {
    const token = RequestContext.getDecodedToken();

    await this.UserRepository.increaseScore(score, token.uid);

    logger.logger.info(message, {
      type: 'score',
      sub,
      uid: token.uid,
      value: score,
    });
    return;
  }

  async updateDeposit(deposit: number, message: string, sub?: string) {
    const token = RequestContext.getDecodedToken();

    await this.UserRepository.increaseDeposit(deposit, token.uid);

    logger.logger.info(message, {
      type: 'deposit',
      sub,
      uid: token.uid,
      value: deposit,
    });
    return;
  }

  async setPreference(place: any, subPlace: any[]) {
    const token = RequestContext.getDecodedToken();

    try {
      const user = await this.UserRepository.findByUid(
        token.uid,
        'studyPreference',
      );

      // 기존 main preference 감소
      if (user?.studyPreference?.place) {
        await this.placeService.updatePrefCnt(
          user.studyPreference.place as string,
          -1,
        );
      }

      // 기존 sub preference 감소
      if (user?.studyPreference?.subPlace?.length) {
        await Promise.all(
          user.studyPreference.subPlace.map((placeId) =>
            this.placeService.updatePrefCnt(placeId, -1),
          ),
        );
      }

      await Promise.all([
        this.UserRepository.updateUser(token.uid, {
          studyPreference: { place, subPlace },
        }),
        this.placeService.updatePrefCnt(place, 1),
        ...subPlace.map((placeId) =>
          this.placeService.updatePrefCnt(placeId, 1),
        ),
      ]);
    } catch (err: any) {
      throw new Error(err);
    }

    return;
  }

  // studyPreference도 id만 보내는 걸로 변경
  async getPreference() {
    const token = RequestContext.getDecodedToken();

    const result = await this.UserRepository.findByUid(
      token.uid,
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
    const token = RequestContext.getDecodedToken();

    try {
      const { startDate, endDate } = info;

      const user = await this.UserRepository.findByUid(token.uid);
      if (!user) throw new Error();

      const startDay = dayjs(startDate, 'YYYY-MM-DD');
      const endDay = dayjs(endDate, 'YYYY-MM-DD');
      const dayDiff = endDay.diff(startDay, 'day');

      const result = await this.UserRepository.setRest(
        info,
        token.uid,
        dayDiff,
      );

      if (!result) throw new Error('User not found or update failed');
      return result;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  async deleteFriend(toUid: string) {
    const token = RequestContext.getDecodedToken();
    await this.UserRepository.deleteFriend(token.uid, toUid);
    return null;
  }

  async setFriend(toUid: string) {
    const token = RequestContext.getDecodedToken();
    await this.UserRepository.updateFriend(token.uid, toUid);

    await this.noticeService.createNotice({
      from: token.uid,
      to: toUid,
      message: `${token.name}님과 친구가 되었습니다.`,
      type: 'friend',
      status: 'response',
    });

    return null;
  }

  async patchBelong(uid: string, belong: string) {
    const updated = await this.UserRepository.updateUser(uid, { belong });

    return updated;
  }

  async getMonthScoreLog() {
    const token = RequestContext.getDecodedToken();

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
        'meta.uid': token.uid,
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
    const token = RequestContext.getDecodedToken();
    const logs = await this.Log.find(
      {
        'meta.uid': token.uid,
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
    const token = RequestContext.getDecodedToken();

    await this.UserRepository.patchLocationDetail(token.uid, text, lat, lon);

    return;
  }

  async updateAddTicket(
    type: 'gather' | 'groupOnline' | 'groupOffline',
    userId: string,
  ) {
    switch (type) {
      case 'gather':
        await this.UserRepository.updateGatherTicket(userId, 1);
        break;
      case 'groupOffline':
        await this.UserRepository.updateGroupStudyTicket(userId, 2);
        break;
      case 'groupOnline':
        await this.UserRepository.updateGroupStudyTicket(userId, 1);
        break;
      default:
        break;
    }
  }

  async updateReduceTicket(
    type: 'gather' | 'groupOnline' | 'groupOffline',
    userId: string,
  ) {
    switch (type) {
      case 'gather':
        await this.UserRepository.updateGatherTicket(userId, -1);
        break;
      case 'groupOffline':
        await this.UserRepository.updateGroupStudyTicket(userId, -2);
        break;
      case 'groupOnline':
        await this.UserRepository.updateGroupStudyTicket(userId, -1);
        break;
      default:
        break;
    }
  }

  async addBadge(badgeIdx: number) {
    const token = RequestContext.getDecodedToken();
    await this.UserRepository.addbadge(token.uid, badgeIdx);
  }

  async selectBadge(badgeIdx: number) {
    const token = RequestContext.getDecodedToken();

    const badgeList: any[] = await this.UserRepository.getBadgeList(token.uid);

    if (badgeList.includes(badgeIdx)) {
      await this.UserRepository.selectbadge(token.uid, badgeIdx);
      return null;
    } else {
      throw new Error('no badge');
    }
  }

  async updateProfileImg(img: Express.Multer.File) {
    const profileImgUrl = await this.imageServiceInstance.uploadSingleImage(
      'profile',
      img.buffer,
    );
    this.updateUser({ profileImage: profileImgUrl });
  }

  async resetGatherTicket() {
    const token = RequestContext.getDecodedToken();
    await this.UserRepository.resetGatherTicket(token.uid);
  }

  async getTicketInfo(userId: string) {
    return await this.UserRepository.getTicketInfo(userId);
  }

  async test() {
    const logs = await this.Log.find({
      $and: [
        { 'meta.value': { $lte: -100 } },
        {
          $or: [
            { message: { $regex: '스터디 가입', $options: 'i' } },
            { message: { $regex: '동아리 가입', $options: 'i' } },
          ],
        },
      ],
    });

    const cleanedData = logs.map((log) => {
      return {
        uid: log.meta.uid,
        point: log.meta.value,
      };
    });

    console.log(cleanedData);
  }
}
