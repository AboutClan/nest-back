import { Inject } from '@nestjs/common';
import dayjs from 'dayjs';
import { CONST, getLatePenalty } from 'src/Constants/CONSTANTS';
import { ENTITY } from 'src/Constants/ENTITY';
import { WEBPUSH_MSG } from 'src/Constants/WEBPUSH_MSG';
import { AppError } from 'src/errors/AppError';
import { FcmService } from 'src/MSA/Notification/core/services/fcm.service';
import { UserService } from 'src/MSA/User/core/services/user.service';
import { RequestContext } from 'src/request-context';
import ImageService from 'src/routes/imagez/image.service';
import { DateUtils, getStudyMinutesUntil } from 'src/utils/Date';
import { IREALTIME_REPOSITORY } from 'src/utils/di.tokens';
import { DatabaseError } from '../../../../errors/DatabaseError'; // 에러 처리 클래스 (커스텀 에러)
import PlaceService from '../../../Place/core/services/place.service';
import {
  IRealtime,
  IRealtimeUser,
  RealtimeUserZodSchema,
} from '../../entity/realtime.entity';
import { CommentProps } from '../domain/Realtime/Comment';
import { PlaceProps } from '../domain/Realtime/Place';
import { Realtime } from '../domain/Realtime/Realtime';
import { RealtimeUser } from '../domain/Realtime/RealtimeUser';
import { TimeProps } from '../domain/Realtime/Time';
import { IRealtimeRepository } from '../interfaces/RealtimeRepository.interface';

export default class RealtimeService {
  constructor(
    @Inject(IREALTIME_REPOSITORY)
    private readonly realtimeRepository: IRealtimeRepository,
    private readonly userServiceInstance: UserService,
    private readonly fcmServiceInstance: FcmService,
    private readonly imageServiceInstance: ImageService,
    private readonly placeServiceInstance: PlaceService,
  ) {}

  private getToday() {
    return DateUtils.getTodayYYYYMMDD();
  }

  async getTodayData(date?: string) {
    // const date = this.getToday();
    if (!date) date = this.getToday();
    const data = await this.realtimeRepository.findByDate(date, false);

    if (!data) {
      const newRealtime = new Realtime({ date });
      return await this.realtimeRepository.create(newRealtime);
    }

    return data;
  }

  /**
   * 같은 좌표로 묶인 realtime 스터디별 참여자 목록. 개인 공부 인증(solo)은 제외한다.
   *
   * realtime은 날짜당 문서 하나에 여러 장소의 스터디가 평평하게 들어 있어
   * "어느 스터디인지"를 장소 좌표로 판정한다.
   */
  async getPlaceGroups(date: string): Promise<{ userIds: string[] }[]> {
    const todayData = await this.getTodayData(date);

    const groups = new Map<string, string[]>();

    for (const who of todayData.userList) {
      if (who.status === 'solo') continue;

      const key = `${who.place?.latitude},${who.place?.longitude}`;
      const userId = who.user?.toString();
      if (!userId) continue;

      groups.set(key, [...(groups.get(key) ?? []), userId]);
    }

    return [...groups.values()].map((userIds) => ({ userIds }));
  }

  /**
   * realtime 등록을 제거한다. 09:00 매칭에서 정규 매칭 쪽으로 편성된 인원을 빼는 데 쓴다.
   * 배치에서 호출되므로 토큰을 읽지 않고, 개설 보상도 회수하지 않는다
   * (본인이 취소한 게 아니라 시스템이 한쪽으로 정리한 것이다).
   */
  async removeUsers(date: string, userIds: string[]) {
    if (!userIds.length) return;

    const todayData = await this.getTodayData(date);

    userIds.forEach((userId) => todayData.deleteVote(userId));

    await this.realtimeRepository.save(todayData);
  }

  //todo: date:YYYYMMDD라 가정
  async createBasicVote(
    studyData: Partial<IRealtime>,
    date: string,
    userId?: string,
  ) {
    const token = RequestContext.getDecodedToken();
    const user = userId ? userId : token.id;
    // 데이터 유효성 검사
    const validatedUserData = RealtimeUserZodSchema.parse({
      ...studyData,
      user,
    });

    const realtime = await this.getTodayData(date);

    // 이미 등록돼 있으면 새로 넣지 않고 교체한다. 예전에는 addUser로 무조건 append해서
    // 같은 유저가 userList에 중복으로 쌓였고(이후 find가 첫 항목만 잡아 유령 항목이 남았다),
    // status가 open이면 호출마다 +100P가 지급돼 포인트를 무한히 받을 수 있었다.
    const isNewUser = !realtime.hasUser(user);

    realtime.patchUser(
      new RealtimeUser({
        user,
        place: validatedUserData.place as PlaceProps,
        time: validatedUserData.time as TimeProps,
        arrived: validatedUserData.arrived,
        image: validatedUserData.image as string,
        memo: validatedUserData.memo,
        comment: validatedUserData.comment as CommentProps,
        status: validatedUserData.status,
        heartCnt: validatedUserData.heartCnt,
      }),
    );

    await this.realtimeRepository.save(realtime);

    // 재신청으로 개설자에게 푸시가 반복되지 않게 신규 등록일 때만 보낸다.
    if (isNewUser && validatedUserData?.status === 'pending') {
      const openUser = realtime.userList.find(
        (u) => u.status === 'open' && u.user.toString() !== user,
      );

      if (openUser) {
        await this.fcmServiceInstance.sendNotificationToXWithId(
          openUser.user.toString(),
          WEBPUSH_MSG.BASE.TITLE,
          '스터디 참여 신청이 들어왔어요!',
          '/studyPage',
        );
      }
    }
    // 개설 보상은 신규 등록에만. 같은 유저가 다시 개설을 눌러도 중복 지급하지 않는다.
    if (isNewUser && validatedUserData?.status === 'open') {
      await this.userServiceInstance.updatePoint(
        CONST.POINT.REALTIME_OPEN,
        '스터디 개설',
        'host',
        token.uid,
      );
      return {
        point: CONST.POINT.REALTIME_OPEN,
        message: '스터디 개설',
      };
    }

    return null;
  }

  //todo: 수정 급함
  //test
  async markAttendance(
    studyData: Partial<IRealtimeUser>,
    buffers: Buffer[],
    date: string,
  ) {
    const token = RequestContext.getDecodedToken();

    try {
      if (!date) date = this.getToday();

      if (buffers.length) {
        const images = await this.imageServiceInstance.uploadImgCom(
          'studyAttend',
          buffers,
        );
        studyData.image = images[0];
      }


      const todayData = await this.getTodayData(date);

      if (todayData.isOpen(token.id)) {
        todayData.patchNotSoloUser(
          token.id,
          studyData.time.end,
          new Date(),
          studyData.memo,
          studyData.image as string,
        );
      } else {
        const validatedStudy = RealtimeUserZodSchema.parse({
          ...studyData,
          time: studyData.time,
          place: studyData.place,
          arrived: new Date(),
          user: token.id,
        });
        todayData.patchUser(validatedStudy as RealtimeUser);
      }

      await this.realtimeRepository.save(todayData);

      if (todayData.isOpen(token.id)) {
        // 지각 벌금은 늦은 시간에 비례한다(100P + 1시간마다 100P).
        const latePenalty = getLatePenalty(todayData.getLateMinutes(token.id));
        const isLate = !!latePenalty;

        const point = CONST.POINT.REALTIME_ATTEND_BEFORE() + latePenalty;

        await this.userServiceInstance.updateScore(
          CONST.SCORE.ATTEND_STUDY,
          '스터디 출석',
        );

        await this.userServiceInstance.updateStudyRecord(
          'study',
          getStudyMinutesUntil(studyData.time.end),
        );

        // 스터디 챌린지 배지 — 출석 1개. 개인 공부 인증(solo)은 스터디 출석이
        // 아니므로 아래 else 분기에서는 주지 않는다.
        await this.userServiceInstance.addStudyBadgeById(token.id);

        const message = `스터디 출석 ${isLate ? '(지각)' : ''}`;
        await this.userServiceInstance.updatePoint(point, message, 'study');

        return {
          point,
          message,
        };
      } else {
        const point = CONST.POINT.REALTIME_ATTEND_SOLO();
        await this.userServiceInstance.updateStudyRecord(
          'solo',
          getStudyMinutesUntil(studyData.time.end),
        );
        await this.userServiceInstance.updateScore(
          CONST.SCORE.ATTEND_PRIVATE_STUDY,
          '개인 공부 인증',
        );

        await this.userServiceInstance.updatePoint(
          point,
          '개인 공부 인증',
          'study',
        );

        return {
          point,
          message: '개인 공부 인증',
        };
      }
    } catch (err) {
      console.log(err);
    }
  }

  // 스터디 정보 업데이트
  async updateStudy(studyData: Partial<IRealtime>, date: string) {
    const token = RequestContext.getDecodedToken();

    const updateFields: Record<string, any> = {};

    Object.keys(studyData).forEach((key) => {
      const value = studyData[key];
      if (value !== undefined && value !== null) {
        updateFields[`userList.$[elem].${key}`] = value;
      }
    });

    if (!date) date = this.getToday();

    const updatedRealtime = await this.realtimeRepository.patchRealtime(
      token.id,
      updateFields,
      date,
    );

    if (!updatedRealtime) throw new DatabaseError('Failed to update study');
    return updatedRealtime;
  }

  /**
   * 개인 공부 인증에 하트를 누른다.
   *
   * 누가 눌렀는지는 저장하지 않고 카운터만 올리는 구조라, 같은 사람이 반복 호출해
   * 수치를 올릴 수 있다. 그건 스키마 변경이 필요해 남겨 두고, 최소한 자기 자신에게
   * 누르는 것과 에러를 삼키는 것만 막는다.
   */
  async increaseHeart(userId: string, date: string) {
    const token = RequestContext.getDecodedToken();

    if (!userId) {
      throw new AppError('하트를 보낼 대상이 필요합니다.', 400);
    }
    if (userId.toString() === token.id?.toString()) {
      throw new AppError('자기 자신에게는 하트를 누를 수 없습니다.', 400);
    }

    const todayData = await this.getTodayData(date);

    if (!todayData.hasUser(userId)) {
      throw new AppError('하트를 보낼 대상을 찾을 수 없습니다.', 400);
    }

    // 예전에는 catch에서 `throw new Error()`로 원인을 지워 500만 남았다.
    todayData.increaseHeartCount(userId);
    await this.realtimeRepository.save(todayData);
  }
  async patchVote(start: any, end: any, date: string) {
    const token = RequestContext.getDecodedToken();

    const todayData = await this.getTodayData(date);

    // 예정 시작 시각이 지난 뒤 시작을 더 뒤로 미루면 지각과 같은 기준으로 차감한다.
    // 그러지 않으면 출석 직전에 시간만 미뤄 지각 벌금을 피할 수 있다.
    const lateMinutes = todayData.updateUserTimeWithLateCheck(
      token.id,
      start,
      end,
    );

    await this.realtimeRepository.save(todayData);

    const point = getLatePenalty(lateMinutes);
    if (!point) return;

    const message = '스터디 시작 시간 지연 변경';
    await this.userServiceInstance.updatePoint(point, message);

    return { point, message };
  }

  async patchAbsence(absence: boolean, date: string, message?: string) {
    const token = RequestContext.getDecodedToken();

    const todayData = await this.getTodayData(date);

    todayData.updateAbsence(token.id, absence, message);

    await this.realtimeRepository.save(todayData);

    if (absence) {
      await this.userServiceInstance.updatePoint(
        CONST.POINT.ABSENCE,
        '스터디 당일 불참',
      );

      return {
        point: CONST.POINT.ABSENCE,
        message: '스터디 당일 불참',
      };
    }
  }

  async deleteVote(date: string, userId?: string) {
    const token = RequestContext.getDecodedToken();
    const targetId = userId || token.id;
    const isSelf = targetId?.toString() === token.id?.toString();

    const todayData = await this.getTodayData(date);

    // 남을 내보내는 건(참여 거절) 그 스터디의 개설자만. 본인 취소는 항상 허용한다.
    // 예전에는 검증이 없어 userId만 넘기면 누구든 남의 등록을 지울 수 있었다.
    if (!isSelf && !todayData.isHostOf(token.id, targetId)) {
      throw new AppError('스터디 개설자만 참여를 거절할 수 있습니다.', 403);
    }

    const isOpen = todayData.deleteVote(targetId);
    await this.realtimeRepository.save(todayData);

    // 개설 보상 회수는 본인이 자기 개설을 취소한 경우에만. 예전에는 대상이 누구든
    // 호출자(token.uid)의 포인트를 깎아, 남을 내보낸 사람이 차감당할 수 있었다.
    if (isOpen && isSelf) {
      // sub은 지급 때와 같은 'host'를 쓴다. 'study'면 updatePoint가 멤버십 +20%를
      // 곱해서, 지급은 +100P인데 회수는 −120P가 된다(차감에 보너스가 붙는 셈).
      await this.userServiceInstance.updatePoint(
        -CONST.POINT.REALTIME_OPEN,
        '스터디 개설 취소',
        'host',
        token.uid,
      );

      return {
        point: -CONST.POINT.REALTIME_OPEN,
        message: '스터디 개설 취소',
      };
    }
  }

  async patchStatus(status: any, date: string, userId?: string) {
    const token = RequestContext.getDecodedToken();
    const targetId = userId ?? token.id;

    // 예전에는 임의 문자열이 그대로 저장됐다(updateStatus가 캐스팅만 한다).
    if (!ENTITY.REALTIME.ENUM_STATUS.includes(status)) {
      throw new AppError('올바르지 않은 상태값입니다.', 400);
    }

    const todayData = await this.getTodayData(date);

    // 상태 변경은 그 스터디의 개설자만. 예전에는 검증이 없어서 참여 신청자가
    // 자기 상태를 스스로 participation으로 승인하거나 남의 상태를 바꿀 수 있었다.
    if (!todayData.isHostOf(token.id, targetId)) {
      throw new AppError(
        '스터디 개설자만 참여 상태를 변경할 수 있습니다.',
        403,
      );
    }

    todayData.updateStatus(targetId, status);

    await this.realtimeRepository.save(todayData);

    // 승인 대상이 본인(개설자)이면 알릴 필요가 없다.
    // 예전에는 userId를 그대로 넘겨 자기 호출 시 undefined에게 푸시를 시도했다.
    if (status === 'participation' && targetId !== token.id) {
      // 스터디 승인인데 제목이 GATHER.TITLE('번개 모임')이었다.
      await this.fcmServiceInstance.sendNotificationToXWithId(
        targetId,
        WEBPUSH_MSG.BASE.TITLE,
        WEBPUSH_MSG.STUDY.ACCEPT(dayjs(date).format('M월 D일(ddd)')),
        `/studyPage`,
      );
    }
  }

  async patchComment(comment: string, date: string) {
    const token = RequestContext.getDecodedToken();

    const todayData = await this.getTodayData(date);

    todayData.updateComment(token.id, comment);
    await this.realtimeRepository.save(todayData);
  }

  // 가장 최근의 스터디 가져오기
  async getRecentStudy(date: string) {
    return await this.getTodayData(date);
  }

  async getTodayDataWithPlace(date?: string, isPopulate: boolean = true) {
    // const date = this.getToday();
    if (!date) date = this.getToday();
    const data = await this.realtimeRepository.findByDate(date, isPopulate);

    if (!data) {
      const newRealtime = new Realtime({ date });
      return await this.realtimeRepository.create(newRealtime);
    }

    for (const user of data.userList) {
      const lat = user.place.latitude;
      const lng = user.place.longitude;

      const place = await this.placeServiceInstance.getPlaceByLatLng(lat, lng);
      if (place) {
        user.updatePlace({ ...place });
      } else {
        const tempPlace = (user as any).place;
        if (tempPlace) {
          (user as any).place = {
            _id: tempPlace._id,
            name: tempPlace.name,
            address: tempPlace.address,
            latitude: tempPlace.latitude,
            longitude: tempPlace.longitude,
          };
        }
      }
    }

    return data;
  }

  async test() {}
}
