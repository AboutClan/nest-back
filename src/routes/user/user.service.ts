import { Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as CryptoJS from 'crypto-js';
import { Model } from 'mongoose';
import { CONST } from 'src/Constants/CONSTANTS';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { ENTITY } from 'src/Constants/ENTITY';
import { BackupService } from 'src/Database/backup.service';
import { AppError } from 'src/errors/AppError';
import { RequestContext } from 'src/request-context';
import { CollectionService } from 'src/routes/collection/collection.service';
import ImageService from 'src/routes/imagez/image.service';
import { ILog } from 'src/routes/logz/log.entity';
import NoticeService from 'src/routes/notice/notice.service';
import PlaceService from 'src/routes/place/place.service';
import { DateUtils } from 'src/utils/Date';
import { IUSER_REPOSITORY } from 'src/utils/di.tokens';
import { getProfile } from 'src/utils/oAuthUtils';
import { IVote } from 'src/vote/vote.entity';
import * as logger from '../../logger';
import { PrizeService } from '../prize/prize.service';
import { IUser, restType } from './user.entity';
import { IUserRepository } from './UserRepository.interface';

@Injectable({ scope: Scope.DEFAULT })
export class UserService {
  constructor(
    @Inject(IUSER_REPOSITORY)
    private readonly UserRepository: IUserRepository,
    @InjectModel('Vote') private Vote: Model<IVote>,
    @InjectModel(DB_SCHEMA.LOG) private Log: Model<ILog>,
    private readonly noticeService: NoticeService,
    private placeService: PlaceService,
    private readonly imageServiceInstance: ImageService,
    private readonly collectionServiceInstance: CollectionService,
    private readonly prizeService: PrizeService,
    private readonly backupService: BackupService,
  ) {}

  async decodeByAES256(encodedTel: string) {
    const token = RequestContext.getDecodedToken();
    try {
      const key = process.env.cryptoKey;
      if (!key) return encodedTel;

      const bytes = CryptoJS.AES.decrypt(encodedTel, key);
      const originalText = bytes.toString(CryptoJS.enc.Utf8);
      return originalText;
    } catch (error) {
      console.error({
        context: 'NestApplication',
        level: 'error',
        message: `${token.uid} Error decoding telephone:${error.message}`,
      });
      return 'Decryption Failed';
    }
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

    // 1) UID로 도메인 User 객체 조회
    const user = await this.UserRepository.findByUid(token.uid);
    if (!user) {
      throw new NotFoundException(`User not found: ${token.uid}`);
    }

    // 2) 도메인 → 순수 JS 객체
    const data = user.toPrimitives();

    // 3) 필요한 필드만 선택
    let picked: Record<string, any> = {};

    if (strArr.length)
      for (const key of strArr) {
        if (!(key in data)) continue;
        picked[key] = data[key];
      }
    else picked = data;

    // 4) telephone 암호화된 경우 복호화
    if ('telephone' in picked && picked.telephone) {
      picked.telephone = await this.decodeByAES256(picked.telephone);
    }

    return picked;
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
    const result = await this.UserRepository.findByUidProjection(
      token.uid,
      ENTITY.USER.C_SIMPLE_USER,
    );

    return result;
  }

  async getAllSimpleUserInfo() {
    const users = await this.UserRepository.findAll(ENTITY.USER.C_SIMPLE_USER);

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
            ENTITY.USER.C_SIMPLE_USER +
              'monthScore weekStudyAccumulationMinutes',
          )
        : await this.UserRepository.findByIsActiveUid(
            token.uid,
            true,
            ENTITY.USER.C_SIMPLE_USER +
              'monthScore weekStudyAccumulationMinutes',
          );

      let attendForm = allUser.map((user) => ({
        uid: user.uid,
        cnt: 0,
        userSummary: { ...user },
      }));

      let forParticipation: any[];
      forParticipation = await this.Vote.collection
        .aggregate([
          {
            $match: {
              date: {
                $gte: DateUtils.getDayJsDate(startDay),
                $lt: DateUtils.getDayJsDate(endDay),
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
                $gte: DateUtils.getDayJsDate(startDay),
                $lt: DateUtils.getDayJsDate(endDay),
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
      weekStudyTargetHour: hour,
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

  async updateRandomPoint(
    point: number,
    message: string,
    sub?: string,
    uid?: string,
  ) {
    const token = RequestContext.getDecodedToken();

    const user = await this.UserRepository.findByUid(uid ?? token.uid);
    user.increasePoint(point);
    await this.UserRepository.save(user);

    logger.logger.info(message, {
      type: 'point',
      sub,
      uid: uid ?? token.uid,
      value: point,
    });
    return;
  }

  async updatePoint(
    point: number,
    message: string,
    sub?: string,
    uid?: string,
  ) {
    const token = RequestContext.getDecodedToken();

    const user = await this.UserRepository.findByUid(uid ?? token.uid);
    user.increasePoint(point);
    await this.UserRepository.save(user);

    logger.logger.info(message, {
      type: 'point',
      sub,
      uid: uid ?? token.uid,
      value: point,
    });
    return;
  }

  async updatePointById(
    point: number,
    message: string,
    sub?: string,
    userId?: string,
  ) {
    const token = RequestContext.getDecodedToken();

    const user = await this.UserRepository.findByUserId(userId ?? token.id);
    user.increasePoint(point);
    await this.UserRepository.save(user);

    logger.logger.info(message, {
      type: 'point',
      sub,
      uid: userId ?? token.id,
      value: point,
    });
    return;
  }

  async updateScoreWithUserId(
    userId: string,
    score: number,
    message: string,
    sub?: string,
  ) {
    const token = RequestContext.getDecodedToken();

    const user = await this.UserRepository.findByUserId(userId);
    user.increaseScore(score);
    user.increaseMonthScore(score);
    await this.UserRepository.save(user);

    logger.logger.info(message, {
      type: 'score',
      sub,
      uid: token.uid,
      value: score,
    });
    return;
  }

  async initMonthScore() {
    await this.UserRepository.initMonthScore();
    return;
  }

  async updateScore(
    score: number,
    message: string,
    sub?: string,
    uid?: string,
  ) {
    const token = RequestContext.getDecodedToken();
    const user = await this.UserRepository.findByUid(uid ?? token.uid);
    user.increaseScore(score);
    user.increaseMonthScore(score);
    await this.UserRepository.save(user);

    logger.logger.info(message, {
      type: 'score',
      sub,
      uid: uid ?? token.uid,
      value: score,
    });
    return;
  }
  async updateStudyRecord(type: 'study' | 'solo') {
    const token = RequestContext.getDecodedToken();
    const user = await this.UserRepository.findByUid(token.uid);
    user.increaseStudyRecord(type);
    await this.UserRepository.save(user);

    return;
  }

  async updateDeposit(deposit: number, message: string, sub?: string) {
    const token = RequestContext.getDecodedToken();

    const user = await this.UserRepository.findByUid(token.uid);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    user.increaseDeposit(deposit);
    await this.UserRepository.save(user);

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

      const startDay = DateUtils.getDayJsYYYYMMDD(startDate);
      const endDay = DateUtils.getDayJsYYYYMMDD(endDate);
      const dayDiff = endDay.diff(startDay, 'day');

      user.setRest(
        info.type,
        startDate.toString(),
        endDate.toString(),
        info.content,
        dayDiff,
      );

      const updated = await this.UserRepository.save(user);
      return updated.toPrimitives();
    } catch (err: any) {
      throw new Error(err);
    }
  }

  async deleteFriend(toUid: string) {
    const token = RequestContext.getDecodedToken();
    const user = await this.UserRepository.findByUid(token.uid);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    user.deleteFriend(toUid);
    await this.UserRepository.save(user);
    return null;
  }

  async setFriend(toUid: string) {
    const token = RequestContext.getDecodedToken();
    const user = await this.UserRepository.findByUid(token.uid);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    const toUser = await this.UserRepository.findByUid(toUid);
    if (!toUser) {
      throw new AppError('Friend not found', 404);
    }
    user.setFriend(toUid);
    toUser.setFriend(token.uid);
    await this.UserRepository.save(user);
    await this.UserRepository.save(toUser);

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

  async patchLocationDetail(
    name: string,
    address: string,
    latitude: number,
    longitude: number,
  ) {
    const token = RequestContext.getDecodedToken();

    const user = await this.UserRepository.findByUid(token.uid);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    user.setLocationDetail(name, address, latitude, longitude);

    await this.UserRepository.save(user);

    return;
  }

  async patchLocationDetailAll(id: string, location: any) {
    console.log(54, id, location);
    await this.UserRepository.updateLocationDetailAll(id, location);

    return;
  }

  async updateAddTicket(
    type: 'gather' | 'groupOnline' | 'groupOffline' | 'groupStudy',
    userId: string,
    ticketNum?: number,
  ) {
    const user = await this.UserRepository.findByUserId(userId);
    switch (type) {
      case 'gather':
        if (!ticketNum) ticketNum = 1;
        user.increaseGatherTicket(ticketNum);
        break;
      case 'groupStudy':
        if (!ticketNum) ticketNum = 1;
        user.increaseGroupStudyTicket(ticketNum);
        break;
      case 'groupOffline':
        if (!ticketNum) ticketNum = 2;
        user.increaseGroupStudyTicket(ticketNum);
        break;
      case 'groupOnline':
        if (!ticketNum) ticketNum = 1;
        user.increaseGroupStudyTicket(ticketNum);
        break;
      default:
        break;
    }
    const { uid } = await this.getUserWithUserId(userId);
    logger.logger.info('티켓 추가', {
      type,
      uid,
      value: ticketNum,
    });
    await this.UserRepository.save(user);
  }

  async updateReduceTicket(
    type: 'gather' | 'groupOnline' | 'groupOffline',
    userId: string,
    num?: number,
  ) {
    let ticketNum;
    const user = await this.UserRepository.findByUserId(userId);
    switch (type) {
      case 'gather':
        ticketNum = -1;
        break;
      case 'groupOffline':
        ticketNum = -2;
        break;
      case 'groupOnline':
        ticketNum = -1;
        break;
      default:
        break;
    }

    if (num) ticketNum = num;

    await this.UserRepository.updateGroupStudyTicket(userId, ticketNum);

    const { uid } = await this.getUserWithUserId(userId);

    logger.logger.info(`티켓 소모`, {
      type,
      uid,
      value: ticketNum,
    });
  }

  async addBadge(id: string, badgeName: string) {
    const token = RequestContext.getDecodedToken();
    let user;

    if (id) {
      user = await this.UserRepository.findByUserId(id);
    } else {
      user = await this.UserRepository.findByUid(token.uid);
    }
    user.addBadge(badgeName);

    await this.UserRepository.save(user);
  }

  async selectBadge(badgeIdx: number) {
    const token = RequestContext.getDecodedToken();

    const user = await this.UserRepository.findByUid(token.uid);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    user.selectBadge(badgeIdx);
    await this.UserRepository.save(user);
  }

  async updateProfileImg(img: Express.Multer.File) {
    const profileImgUrl = await this.imageServiceInstance.uploadSingleImage(
      'profile',
      img.buffer,
    );
    this.updateUser({ profileImage: profileImgUrl });
  }

  async resetGatherTicket() {
    await this.UserRepository.resetGatherTicket();
  }

  async getTicketInfo(userId: string) {
    const user = await this.UserRepository.findByUserId(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    return user.ticket;
  }

  async setVoteArriveInfo(userId: string, end: string) {
    const userData = await this.UserRepository.findByUserId(userId);

    if (userData) {
      const diffMinutes = DateUtils.getMinutesDiffFromNow(end);
      const record = userData.studyRecord;

      userData.setRecord(
        record.accumulationMinutes + diffMinutes,
        record.accumulationCnt + 1,
        record.monthMinutes + diffMinutes,
        record.monthCnt + 1,
      );

      await this.UserRepository.save(userData);
    }

    await this.updateScore(CONST.SCORE.ATTEND_STUDY, '스터디 출석');

    return null;
  }

  async processTemperature() {
    const baseDate = new Date('2025-08-01T00:00:00.000Z');

    const end = new Date(baseDate);
    const start = new Date(baseDate);
    start.setDate(end.getDate() - 45);
    end.setDate(end.getDate() - 15);

    const allTemps = await this.noticeService.getTemperatureByPeriod(
      start,
      end,
    );

    allTemps.sort(
      (a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const handledPair = new Set<string>();
    const tempMap = new Map<
      string,
      { score: number; cnt: number; blockCnt: number }
    >();

    for (const temp of allTemps) {
      const { from, to, sub: degree } = temp;
      if (from === to) continue;

      const pairKey = `${from}-${to}`;
      if (handledPair.has(pairKey)) continue;
      handledPair.add(pairKey);

      // 점수 환산
      let score = 0;
      switch (degree) {
        case 'great':
          score = 4.8;
          break;
        case 'good':
          score = 0.8;
          break;
        case 'soso':
          score = -1.2;
          break;
        case 'block':
          score = -5.2;
          break;
        case 'cancel':
          score = -1.0;
          break;
        case 'noshow':
          score = -2.0;
          break;
      }

      const prev = tempMap.get(to) ?? { score: 0, cnt: 0, blockCnt: 0 };
      tempMap.set(to, {
        score: prev.score + score,
        cnt: prev.cnt + 1,
        blockCnt: degree === 'block' ? prev.blockCnt + 1 : prev.blockCnt,
      });
    }

    for (const [uid, { score, cnt, blockCnt }] of tempMap) {
      const user = await this.UserRepository.findByUid(uid);
      if (!user) continue;

      const temp = user.temperature ?? { sum: 0, cnt: 0, blockCnt: 0 };
      const newBlockCnt = temp.blockCnt + blockCnt;
      let newSum = temp.sum + Math.round(score * 10) / 10;
      if (blockCnt > 0) {
        newSum -= newBlockCnt * 5.2;
      }
      const newCnt = temp.cnt + cnt;

      const addTemp = this.calculateScore(newSum, newCnt);

      const userData = await this.UserRepository.findByUid(uid);
      userData.setTemperature(
        Math.ceil(addTemp * 10) / 10,
        newSum,
        newCnt,
        newBlockCnt,
      );
      await this.UserRepository.save(userData);
    }
  }

  calculateScore(totalScore: number, cnt: number): number {
    const result =
      (totalScore / cnt) * 2.2 * Math.pow(1 - Math.exp(-0.07 * cnt), 1.2);
    const final = result.toFixed(1);

    return +final;
  }

  async processMonthPrize() {
    const ranks = ENTITY.USER.ENUM_RANK;

    const top5 = await this.UserRepository.findMonthPrize(
      ranks as unknown as any[],
    );

    for (const rank of ranks) {
      const top5UserIds = top5[rank].map((user) => user._id.toString());
      this.prizeService.recordMonthPrize(rank, top5UserIds);

      if (rank === ENTITY.USER.RANK_SILVER) {
        const pointList = [5000, 3000, 2000, 1000, 100];
        for (let i = 0; i < top5UserIds.length; i++) {
          const userId = top5UserIds[i];
          const point = pointList[i] || 1000; // 기본값 1000
          await this.updatePointById(
            point,
            `월간 ${rank} 등수 보상`,
            '월간 점수 보상',
            userId,
          );
        }
      } else if (rank === ENTITY.USER.RANK_BRONZE) {
        const pointList = [3000, 2000, 1000, 1000, 1000];
        for (let i = 0; i < top5UserIds.length; i++) {
          const userId = top5UserIds[i];
          const point = pointList[i] || 1000; // 기본값 1000
          await this.updatePointById(
            point,
            `월간 ${rank} 등수 보상`,
            '월간 점수 보상',
            userId,
          );
        }
      }
    }
  }

  async processMonthScore() {
    try {
      const firstDayOfLastMonth = DateUtils.getFirstDayOfLastMonth();

      const uids =
        await this.UserRepository.resetPointByMonthScore(firstDayOfLastMonth);

      await this.UserRepository.processMonthScore();

      await this.processMonthPrize();

      await this.UserRepository.resetMonthScore();

      uids.forEach((tempUid) => {
        const point = -1000;
        const uid = tempUid;

        const message = `월간 점수 정산`;
        logger.logger.info(message, {
          type: 'point',
          sub: '월간 점수 초기화',
          uid,
          value: point,
        });
      });
    } catch (error) {
      console.error('Error processing month score:', error);
      throw new AppError('Failed to process month score', 500);
    }
  }

  async processTicket() {
    const whiteList = [];
    await this.UserRepository.processTicket(whiteList);
  }

  async updateTicketWithUserIds(userIds: string[], ticketNum: number) {
    await this.UserRepository.updateTicketWithUserIds(userIds, ticketNum);
  }

  async test() {
    await this.UserRepository.test();
    // const users = await this.UserRepository.findAll();
    // for (const user of users) {
    //   const userDate = user.registerDate;
    //   const userId = user._id;
    //   const point = user.point;
    //   if (userDate.length < 5) continue;
    //   if (userDate >= '2025-07-01') {
    //     if (point < 8000) {
    //       const difference = 8000 - point;
    //       await this.updatePointById(
    //         difference,
    //         '포인트 오류 복구 보상',
    //         `${difference} point 지급`,
    //         userId,
    //       );
    //     }
    //   } else {
    //     if (point < 3000) {
    //       const difference = 3000 - point;
    //       await this.updatePointById(
    //         difference,
    //         '포인트 오류 복구 보상',
    //         `${difference} point 지급`,
    //         userId,
    //       );
    //     }
    //   }
    // }
  }
}
