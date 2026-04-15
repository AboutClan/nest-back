import { Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import * as CryptoJS from 'crypto-js';
import { CONST } from 'src/Constants/CONSTANTS';
import { ENTITY } from 'src/Constants/ENTITY';
import { AppError } from 'src/errors/AppError';
import { logger } from 'src/logger';
import NoticeService from 'src/MSA/Notice/core/services/notice.service';
import { FcmService } from 'src/MSA/Notification/core/services/fcm.service';
import PlaceService from 'src/MSA/Place/core/services/place.service';
import { PrizeService } from 'src/MSA/Store/core/services/prize.service';
import { RequestContext } from 'src/request-context';
import ImageService from 'src/routes/imagez/image.service';
import { DateUtils } from 'src/utils/Date';
import {
  ILOG_MEMBERSHIP_REPOSITORY,
  ILOG_TEMPERATURE_REPOSITORY,
  IUSER_REPOSITORY,
} from 'src/utils/di.tokens';
import { getProfile } from 'src/utils/oAuthUtils';
import { ILogTemperature } from '../../entity/logTemperature.entity';
import { IUser, restType } from '../../entity/user.entity';
import { ILogMembershipRepository } from '../interfaces/LogMembership.interface';
import { ILogTemperatureRepository } from '../interfaces/LogTemperature.interface';
import { IUserRepository } from '../interfaces/UserRepository.interface';
@Injectable({ scope: Scope.DEFAULT })
export class UserService {
  constructor(
    @Inject(IUSER_REPOSITORY)
    private readonly UserRepository: IUserRepository,
    @Inject(ILOG_MEMBERSHIP_REPOSITORY)
    private readonly LogMembershipRepository: ILogMembershipRepository,
    @Inject(ILOG_TEMPERATURE_REPOSITORY)
    private readonly LogTemperatureRepository: ILogTemperatureRepository,
    private readonly noticeService: NoticeService,
    private placeService: PlaceService,
    private readonly imageServiceInstance: ImageService,
    private readonly fcmServiceInstance: FcmService,
    private readonly prizeService: PrizeService,
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

  async getSimpleUserInfo() {
    const token = RequestContext.getDecodedToken();
    const result = await this.UserRepository.findByUidProjection(
      token.uid,
      ENTITY.USER.C_SIMPLE_USER,
    );

    return result;
  }

  async updateUser(updateInfo: Partial<IUser>) {
    const token = RequestContext.getDecodedToken();

    const updated = await this.UserRepository.updateUser(token.uid, updateInfo);
    return updated;
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

  async updatePoint(
    point: number,
    message: string,
    sub?: string,
    uid?: string,
  ) {
    const token = RequestContext.getDecodedToken();
    let newPoint = point;
    let newMessage = message;

    const user = await this.UserRepository.findByUid(uid ?? token.uid);

    const membership = user?.membership || 'normal';

    const studySupArr = [
      'manager',
      'newbie',
      'studySupporters',
    ] as (typeof ENTITY.USER.ENUM_MEMBERSHIP)[number][];

    if (sub === 'study' && studySupArr.includes(membership)) {
      newPoint = Math.floor(newPoint * 1.2);
      newMessage = message + ` (멤버십 +20%)`;
    }

    user.increasePoint(newPoint);
    await this.UserRepository.save(user);

    logger?.info(newMessage, {
      type: 'point',
      sub,
      uid: uid ?? token.uid,
      value: newPoint,
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

    logger?.info(message, {
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

    logger?.info(message, {
      type: 'score',
      sub,
      uid: token.uid,
      value: score,
    });
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

    logger?.info(message, {
      type: 'score',
      sub,
      uid: uid ?? token.uid,
      value: score,
    });
    return;
  }
  async updateStudyRecord(type: 'study' | 'solo', diffMinutes: number) {
    const token = RequestContext.getDecodedToken();

    const user = await this.UserRepository.findByUid(token.uid);

    user.increaseStudyRecord(type, diffMinutes);
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

    logger?.info(message, {
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
        'secede',
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

  async patchLocationDetailAll() {
    await this.UserRepository.updateLocationDetailAll();

    return;
  }

  async updateAddRandomTicket(userId: string, number: number) {
    const token = RequestContext.getDecodedToken();
    const user = await this.UserRepository.findByUserId(userId);
    user.increaseRandomTicket(number);

    await this.UserRepository.save(user);

    const userUid = user.uid;

    if (number > 0) {
      const isMine = token.id.toString() !== userId;

      await this.noticeService.createNotice({
        from: token.uid,
        to: userUid,
        type: 'randomTicket',
        message: `${token.name === '이승주' || !token.name || isMine ? '어바웃' : token.name}님에게 이벤트 뽑기권을 받았어요!`,
        status: 'pending',
      });
      await this.fcmServiceInstance.sendNotificationToXWithId(
        userId,
        '🎁 이벤트 뽑기권 도착!',
        `${token.name === '이승주' || !token.name || isMine ? '어바웃' : token.name}님이 열활 멤버 보상으로 이벤트 뽑기권을 선물했어요. 접속해서 확인해 보세요!`,
        `/notice?type=active`,
      );
    }

    return;
  }

  async updateAddTicket(
    type: 'gather' | 'groupOnline' | 'groupOffline' | 'groupStudy',
    userId: string,
    ticketNum?: number,
    category?: 'create' | 'return',
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

    const first = type === 'gather' ? '번개' : '소모임';
    const second = category === 'create' ? '구매' : '반환';

    logger?.info(`${first} 참여권 ${second}`, {
      type,
      uid,
      value: ticketNum,
    });
    await this.UserRepository.save(user);
  }

  async updateReduceTicket(
    type: 'gather' | 'group',
    userId: string,
    ticketNum: number,
  ) {
    let updatedTicket = null;
    if (type === 'gather') {
      updatedTicket = await this.UserRepository.updateGatherTicket(
        userId,
        ticketNum,
      );
    } else {
      updatedTicket = await this.UserRepository.updateGroupStudyTicket(
        userId,
        ticketNum,
      );
    }

    const { uid } = await this.getUserWithUserId(userId);

    const message =
      type === 'gather' ? '번개 모임 참여' : '소모임 가입(또는 유지)';

    logger?.info(message, {
      type: `${type}Ticket`,
      uid,
      value: ticketNum,
    });

    return updatedTicket;
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
      await this.UserRepository.save(userData);
    }

    await this.updateScore(CONST.SCORE.ATTEND_STUDY, '스터디 출석');

    return null;
  }

  async processTemperature(options?: { type: 1 | 2 }) {
    const baseDate = new Date();

    // type 1: 지난달 1일 ~ 지난달 마지막일
    // type 2: 지지난달 16일 ~ 지난달 15일
    const end =
      options?.type === 1
        ? new Date(baseDate.getFullYear(), baseDate.getMonth() - 1, 15)
        : new Date(baseDate.getFullYear(), baseDate.getMonth(), 0); // 지난달의 마지막 날 (year, month, 0은 이전 달의 마지막 날)

    // 지지난달 16일
    const start =
      options?.type === 1
        ? new Date(baseDate.getFullYear(), baseDate.getMonth() - 1, 1)
        : new Date(baseDate.getFullYear(), baseDate.getMonth() - 1, 16);
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

      let addTemp = 0;
      if (user.role === 'previliged') {
        addTemp = this.calculateScore(newSum * 5, newCnt * 5);
      } else if (
        user.membership === 'manager' ||
        user.membership === 'gatherSupporters'
      ) {
        addTemp = this.calculateScore(newSum * 2.5, newCnt * 2.5);
      } else {
        addTemp = this.calculateScore(newSum, newCnt);
      }

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
      (totalScore / cnt) * 2.2 * Math.pow(1 - Math.exp(-0.07 * cnt), 1.3);
    const final = result.toFixed(1);

    return +final;
  }

  private scoreForTemperatureDegree(degree: string): number {
    switch (degree) {
      case 'great':
        return 5.5;
      case 'good':
        return 0.8;
      case 'soso':
        return -1.8;
      case 'block':
        return -6.5;
      case 'cancel':
        return -1.0;
      case 'noshow':
        return -2.0;
      default:
        return 0;
    }
  }

  /** (from,to) 쌍별 최신 3건까지 집계. 최근순 가중: 1번째 1.0, 2번째 0.5, 3번째 0.3 */
  private aggregateLogTemperatureDeltasByTo(
    logs: Pick<ILogTemperature, 'from' | 'to' | 'sub' | 'timestamp'>[],
  ): Map<string, { score: number; cnt: number; blockCnt: number }> {
    const byPair = new Map<
      string,
      Pick<ILogTemperature, 'from' | 'to' | 'sub' | 'timestamp'>[]
    >();
    for (const log of logs) {
      const { from, to } = log;
      if (from === to) continue;
      const pairKey = `${from}-${to}`;
      if (!byPair.has(pairKey)) byPair.set(pairKey, []);
      byPair.get(pairKey)!.push(log);
    }

    const byTo = new Map<
      string,
      { score: number; cnt: number; blockCnt: number }
    >();

    for (const pairLogs of byPair.values()) {
      pairLogs.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );
      const picked = pairLogs.slice(0, 3);
      const recencyWeights = [1.0, 0.5, 0.3];
      for (let i = 0; i < picked.length; i++) {
        const log = picked[i];
        const w = recencyWeights[i] ?? 0;
        const degree = log.sub;
        const score = this.scoreForTemperatureDegree(degree) * w;
        const { to } = log;
        const prev = byTo.get(to) ?? { score: 0, cnt: 0, blockCnt: 0 };
        byTo.set(to, {
          score: prev.score + score,
          cnt: prev.cnt + 1,
          blockCnt: degree === 'block' ? prev.blockCnt + 1 : prev.blockCnt,
        });
      }
    }

    return byTo;
  }

  /** processTemperature와 동일한 방식으로 배치 반영 */
  private applyTemperatureBatch(
    sum: number,
    cnt: number,
    blockCnt: number,
    batch: { score: number; cnt: number; blockCnt: number },
  ): { sum: number; cnt: number; blockCnt: number } {
    const newBlockCnt = blockCnt + batch.blockCnt;
    let newSum = sum + Math.round(batch.score * 10) / 10;
    if (batch.blockCnt > 0) {
      newSum -= newBlockCnt * 6.5;
    }
    const newCnt = cnt + batch.cnt;
    return { sum: newSum, cnt: newCnt, blockCnt: newBlockCnt };
  }

  /** applyTemperatureBatch로 반영된 배치를 되돌림 (현재 sum·cnt·blockCnt는 배치 적용 후 상태) */
  private undoTemperatureBatch(
    sum: number,
    cnt: number,
    blockCnt: number,
    batch: { score: number; cnt: number; blockCnt: number },
  ): { sum: number; cnt: number; blockCnt: number } {
    const newBlockCnt = blockCnt - batch.blockCnt;
    let newSum = sum - Math.round(batch.score * 10) / 10;
    if (batch.blockCnt > 0) {
      newSum += blockCnt * 6.5;
    }
    const newCnt = cnt - batch.cnt;
    return { sum: newSum, cnt: newCnt, blockCnt: newBlockCnt };
  }

  async processMonthScore() {
    try {
      const firstDayOfLastMonth = DateUtils.getFirstDayOfLastMonth();

      const uids =
        await this.UserRepository.resetPointByMonthScore(firstDayOfLastMonth);

      await this.UserRepository.processMonthScore();

      await this.prizeService.processMonthPrize();

      await this.UserRepository.resetMonthScore();

      uids.forEach((tempUid) => {
        const point = -1000;
        const uid = tempUid;

        const message = `월간 최소 활동 미달`;
        logger?.info(message, {
          type: 'point',
          sub: '월간 점수 초기화',
          uid,
          value: point,
        });
      });
    } catch (error) {
      throw new AppError(
        error?.message ?? 'Failed to process month score',
        500,
      );
    }
  }

  async patchMembership(type: 'create' | 'decay') {
    const token = RequestContext.getDecodedToken();
    const user = await this.UserRepository.findByUid(token.uid);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    if (type === 'create') {
      user.createMembership();
    } else {
      user.decayMembership();
    }
    await this.UserRepository.save(user);

    await this.LogMembershipRepository.create({
      userId: user._id.toString(),
      type,
      timestamp: new Date(),
    });
  }

  async getMembershipLog() {
    const token = RequestContext.getDecodedToken();
    const logs = await this.LogMembershipRepository.findByUserId(
      token.id.toString(),
    );
    return logs;
  }

  async processTicket() {
    const whiteList = [];
    await this.UserRepository.processTicket(whiteList);
  }

  async updateTicketWithUserIds(userIds: string[], ticketNum: number) {
    await this.UserRepository.updateTicketWithUserIds(userIds, ticketNum);
  }

  async processStudyEngage() {
    const users = await this.UserRepository.findAllForStudyEngage();

    const userIds = users.map((user) => user._id.toString());

    const random = Math.floor(Math.random() * 2);
    const title =
      random === 0
        ? '이번주 카공 같이 할 사람? ✨'
        : '공부도 하고, 상품도 GET! 💰';
    const description =
      random === 0
        ? '근처에 있는 멤버들이 스터디 기다리고 있어요! 지금 신청하고 같이 카공해요!'
        : '스터디 신청만 해도 포인트가 와르르 🎁 다음 주 함께 공부할 멤버를 찾고 있어요 🚀';

    await this.fcmServiceInstance.sendNotificationUserIds(
      userIds,
      title,
      description,
    );
  }

  async initMembership() {
    await this.UserRepository.initMembership();
  }

  async recommendNoticeAllUser() {
    const users = await this.UserRepository.findAll();

    const userIds = users.map((user) => user._id.toString());

    const random = Math.floor(Math.random() * 2);
    const title =
      random === 0
        ? '🤩 이번주 내 취향을 저격할 모임은?'
        : '😎 내 관심사랑 딱 맞는 번개 둘러보기';
    const description =
      random === 0
        ? '취향이 통하는 멤버들과 함께 다양한 추억을 만들어보세요🍀'
        : '지금 가장 인기 있는 모임 주제들을 한눈에 확인하세요🍀';

    await this.fcmServiceInstance.sendNotificationUserIds(
      userIds,
      title,
      description,
    );
  }

  async test() {
    return await this.processTemperature2();
  }

  async processTemperature2() {
    const monthBeforeLast = DateUtils.getSeoulMonthRangeByMonthsAgo(2);
    const lastMonth = DateUtils.getSeoulMonthRangeByMonthsAgo(1);

    const logTemperatureMonthBeforeLast =
      await this.LogTemperatureRepository.findTemperatureByPeriod(
        monthBeforeLast.start,
        monthBeforeLast.end,
      );

    const logTemperatureLastMonth =
      await this.LogTemperatureRepository.findTemperatureByPeriod(
        lastMonth.start,
        lastMonth.end,
      );

    console.log('logTemperatureMonthBeforeLast', logTemperatureMonthBeforeLast);
    console.log('logTemperatureLastMonth', logTemperatureLastMonth);

    const subMap = this.aggregateLogTemperatureDeltasByTo(
      logTemperatureMonthBeforeLast,
    );
    const addMap = this.aggregateLogTemperatureDeltasByTo(
      logTemperatureLastMonth,
    );

    const uids = new Set([...subMap.keys(), ...addMap.keys()]);

    for (const uid of uids) {
      const user = await this.UserRepository.findByUid(uid);
      if (!user) continue;

      const temp = user.temperature ?? { sum: 0, cnt: 0, blockCnt: 0 };
      const sub = subMap.get(uid) ?? { score: 0, cnt: 0, blockCnt: 0 };
      const add = addMap.get(uid) ?? { score: 0, cnt: 0, blockCnt: 0 };

      let sum = temp.sum ?? 0;
      let cnt = temp.cnt ?? 0;
      let blockCnt = temp.blockCnt ?? 0;

      ({ sum, cnt, blockCnt } = this.undoTemperatureBatch(
        sum,
        cnt,
        blockCnt,
        sub,
      ));
      ({ sum, cnt, blockCnt } = this.applyTemperatureBatch(
        sum,
        cnt,
        blockCnt,
        add,
      ));

      let addTemp = 0;

      if (cnt > 0) {
        if (user.role === 'previliged') {
          addTemp = this.calculateScore(sum * 4, cnt * 4);
        } else if (
          user.membership === 'manager' ||
          user.membership === 'gatherSupporters'
        ) {
          addTemp = this.calculateScore(sum * 2, cnt * 2);
        } else {
          addTemp = this.calculateScore(sum, cnt);
        }
      } else {
        sum = 0;
        cnt = 0;
        blockCnt = 0;
      }

      const userData = await this.UserRepository.findByUid(uid);
      if (!userData) continue;
      userData.setTemperature(Math.ceil(addTemp * 10) / 10, sum, cnt, blockCnt);
      // await this.UserRepository.save(userData);
    }
  }
}
