import { Inject } from '@nestjs/common';
import { CONST } from 'src/Constants/CONSTANTS';
import { CommentProps } from 'src/domain/entities/Realtime/Comment';
import { PlaceProps } from 'src/domain/entities/Realtime/Place';
import { Realtime } from 'src/domain/entities/Realtime/Realtime';
import { RealtimeUser } from 'src/domain/entities/Realtime/RealtimeUser';
import { TimeProps } from 'src/domain/entities/Realtime/Time';
import { RequestContext } from 'src/request-context';
import { CollectionService } from 'src/routes/collection/collection.service';
import ImageService from 'src/routes/imagez/image.service';
import { UserService } from 'src/routes/user/user.service';
import { DateUtils } from 'src/utils/Date';
import { IREALTIME_REPOSITORY } from 'src/utils/di.tokens';
import { VoteService } from 'src/vote/vote.service';
import { DatabaseError } from '../../errors/DatabaseError'; // 에러 처리 클래스 (커스텀 에러)
import PlaceService from '../place/place.service';
import {
  IRealtime,
  IRealtimeUser,
  RealtimeUserZodSchema,
} from './realtime.entity';
import { IRealtimeRepository } from './RealtimeRepository.interface';

export default class RealtimeService {
  constructor(
    @Inject(IREALTIME_REPOSITORY)
    private readonly realtimeRepository: IRealtimeRepository,
    private readonly userServiceInstance: UserService,
    private readonly imageServiceInstance: ImageService,
    private readonly voteServiceInstance: VoteService,
    private readonly placeServiceInstance: PlaceService,
  ) {}

  private getToday() {
    return DateUtils.getTodayYYYYMMDD();
  }

  async setResult() {
    const realtimeData = await this.getTodayData('2023-04-09');

    const realtimeMap = new Map<string, any[]>();

    realtimeData.userList.forEach((data) => {
      const key = `${data.place.latitude}${data.place.longitude}`;

      if (realtimeMap.has(key)) {
        realtimeMap.set(key, [
          ...realtimeMap.get(key),
          {
            userId: (data.user as any)._id,
            start: data.time.start,
            end: data.time.end,
          },
        ]);
      } else {
        realtimeMap.set(key, [
          {
            userId: (data.user as any)._id,
            start: data.time.start,
            end: data.time.end,
          },
        ]);
      }
    });

    const ONE_HOUR_MS = 60 * 60 * 1000;

    const overlappingUserIds = new Set<string>();

    for (const entries of realtimeMap.values()) {
      for (let i = 0; i < entries.length; i++) {
        for (let j = i + 1; j < entries.length; j++) {
          for (let k = j + 1; k < entries.length; k++) {
            const a = entries[i];
            const b = entries[j];
            const c = entries[k];

            const starts = [a.start, b.start, c.start].map(Date.parse);
            const ends = [a.end, b.end, c.end].map(Date.parse);

            const maxStart = Math.max(...starts);
            const minEnd = Math.min(...ends);

            if (minEnd - maxStart >= ONE_HOUR_MS) {
              overlappingUserIds.add(a.userId);
              overlappingUserIds.add(b.userId);
              overlappingUserIds.add(c.userId);
            }
          }
        }
      }
    }

    const resultUserIds = Array.from(overlappingUserIds);

    await this.realtimeRepository.updateStatusWithIdArr(
      '2023-04-09',
      resultUserIds,
    );

    return resultUserIds;
  }

  async getTodayData(date?: string) {
    // const date = this.getToday();
    if (!date) date = this.getToday();
    const data = await this.realtimeRepository.findByDate(date);

    if (!data) {
      const newRealtime = new Realtime({ date });
      return await this.realtimeRepository.create(newRealtime);
    }

    return data;
  }

  //todo: date:YYYYMMDD라 가정
  async createBasicVote(
    studyData: Partial<IRealtime>,
    date: string,
    userId?: string,
  ) {
    const token = RequestContext.getDecodedToken();

    // 데이터 유효성 검사
    const validatedUserData = RealtimeUserZodSchema.parse({
      ...studyData,
      user: userId ? userId : token.id,
    });

    this.voteServiceInstance.deleteVote(date);

    const realtime = await this.getTodayData(date);

    realtime.addUser(
      new RealtimeUser({
        user: token.id,
        place: validatedUserData.place as PlaceProps,
        time: validatedUserData.time as TimeProps,
        arrived: validatedUserData.arrived,
        image: validatedUserData.image as string,
        memo: validatedUserData.memo,
        comment: validatedUserData.comment as CommentProps,
        status: validatedUserData.status,
      }),
    );

    await this.realtimeRepository.save(realtime);

    if (validatedUserData?.status === 'open') {
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

      await this.voteServiceInstance.deleteVote(date);

      const todayData = await this.getTodayData(date);
      if (todayData.isOpen(token.id, 'user')) {
        todayData.patchNotSoloUser(
          token.id,
          studyData.time.end,
          new Date(),
          studyData.memo,
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

      if (todayData.isOpen(token.id, 'string')) {
        const isLate = todayData.isLate(token.id);

        const point = isLate
          ? CONST.POINT.REALTIME_ATTEND_BEFORE() + CONST.POINT.LATE
          : CONST.POINT.REALTIME_ATTEND_BEFORE();

        await this.userServiceInstance.updateScore(
          CONST.SCORE.ATTEND_STUDY,
          '스터디 출석',
        );

        const message = `스터디 출석 ${isLate ? '(지각)' : ''}`;
        await this.userServiceInstance.updatePoint(point, message, 'study');

        return {
          point,
          message,
        };
      } else {
        const point = CONST.POINT.REALTIME_ATTEND_SOLO();

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

  async patchVote(start: any, end: any, date: string) {
    const token = RequestContext.getDecodedToken();

    const todayData = await this.getTodayData(date);

    try {
      todayData.updateUserTime(token.id, start, end);
      await this.realtimeRepository.save(todayData);
    } catch (err) {
      throw new Error();
    }
  }

  async patchAbsence(absence: boolean, date: string, message?: string) {
    const token = RequestContext.getDecodedToken();

    const todayData = await this.getTodayData(date);

    todayData.updateAbsence(token.id, absence, message);

    await this.realtimeRepository.save(todayData);

    if (absence) {
      await this.userServiceInstance.updatePoint(
        CONST.POINT.ABSENCE,
        'realtime solo 결석',
      );

      return {
        point: CONST.POINT.ABSENCE,
        message: 'realtime solo 결석',
      };
    }
  }

  async deleteVote(date: string) {
    const token = RequestContext.getDecodedToken();

    const todayData = await this.getTodayData(date);

    const isOpen = todayData.deleteVote(token.id);
    await this.realtimeRepository.save(todayData);

    if (isOpen) {
      await this.userServiceInstance.updatePoint(
        -CONST.POINT.REALTIME_OPEN,
        '스터디 개설 취소',
        'study',
        token.uid,
      );

      return {
        point: -CONST.POINT.REALTIME_OPEN,
        message: '스터디 개설 취소',
      };
    }
  }

  async patchStatus(status: any, date: string) {
    const token = RequestContext.getDecodedToken();

    const todayData = await this.getTodayData(date);

    todayData.updateStatus(token.id, status);

    await this.realtimeRepository.save(todayData);
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

  async getTodayDataWithPlace(date?: string) {
    // const date = this.getToday();
    if (!date) date = this.getToday();
    const data = await this.realtimeRepository.findByDate(date);

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
