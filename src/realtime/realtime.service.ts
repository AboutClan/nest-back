import { JWT } from 'next-auth/jwt';
import { DatabaseError } from '../errors/DatabaseError'; // 에러 처리 클래스 (커스텀 에러)
import { Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import {
  IRealtime,
  IRealtimeUser,
  RealtimeUserZodSchema,
} from './realtime.entity';
import { IVoteService } from 'src/vote/voteService.interface';
import {
  ICOLLECTION_SERVICE,
  IIMAGE_SERVICE,
  IREALTIME_REPOSITORY,
  IUSER_SERVICE,
  IVOTE_SERVICE,
} from 'src/utils/di.tokens';
import { IImageService } from 'src/imagez/imageService.interface';
import { ICollectionService } from 'src/collection/collectionService.interface';
import { IRealtimeService } from './realtimeService';
import { RealtimeRepository } from './realtime.repository.interface';
import { IUserService } from 'src/user/userService.interface';

export default class RealtimeService implements IRealtimeService {
  private token: JWT;

  constructor(
    @Inject(IREALTIME_REPOSITORY)
    private readonly realtimeRepository: RealtimeRepository,
    @Inject(IUSER_SERVICE) private readonly userServiceInstance: IUserService,
    @Inject(IIMAGE_SERVICE) private imageServiceInstance: IImageService,
    @Inject(IVOTE_SERVICE) private voteServiceInstance: IVoteService,
    @Inject(ICOLLECTION_SERVICE)
    private collectionServiceInstance: ICollectionService,
    @Inject(REQUEST) private readonly request: Request, // Request 객체 주입
  ) {
    this.token = this.request?.decodedToken;
  }

  getToday() {
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0); // 시간을 0시 0분 0초 0밀리초로 설정
    return todayMidnight;
  }

  async getTodayData() {
    const date = this.getToday();
    const data = await this.realtimeRepository.findByDate(date);

    if (!data) {
      return await this.realtimeRepository.createByDate(date);
    }

    return data;
  }

  // 기본 투표 생성
  async createBasicVote(studyData: Partial<IRealtime>) {
    const date = this.getToday();
    // 데이터 유효성 검사
    const validatedUserData = RealtimeUserZodSchema.parse({
      ...studyData,
      status: 'pending',
      user: this.token.id,
    });

    this.voteServiceInstance.deleteVote(date);

    const updatedData = await this.realtimeRepository.patchUser(
      date,
      validatedUserData,
    );

    return updatedData;
  }

  //todo: 수정 급함
  //test
  async markAttendance(studyData: Partial<IRealtimeUser>, buffers: Buffer[]) {
    try {
      const date = this.getToday();

      const validatedStudy = RealtimeUserZodSchema.parse({
        ...studyData,
        time: studyData.time,
        place: studyData.place,
        arrived: new Date(),
        user: this.token.id,
      });

      if (buffers.length) {
        const images = await this.imageServiceInstance.uploadImgCom(
          'studyAttend',
          buffers,
        );

        studyData.image = images[0];
      }

      await this.voteServiceInstance.deleteVote(date);

      await this.realtimeRepository.patchAttendance(
        date,
        validatedStudy,
        this.token.id,
      );

      const result = this.collectionServiceInstance.setCollectionStamp(
        this.token.id,
      );

      await this.userServiceInstance.updatePoint(5, '스터디 출석');
      return result;
    } catch (err) {
      console.log(err);
    }
  }

  // 스터디 정보 업데이트
  async updateStudy(studyData: Partial<IRealtime>) {
    const updateFields: Record<string, any> = {};

    Object.keys(studyData).forEach((key) => {
      const value = studyData[key];
      if (value !== undefined && value !== null) {
        // `prefix`를 포함한 필드명을 동적으로 설정
        updateFields[`userList.$[elem].${key}`] = value;
      }
    });

    const updatedRealtime = await this.realtimeRepository.patchRealtime(
      this.token.id,
      updateFields,
      this.getToday(),
    );

    if (!updatedRealtime) throw new DatabaseError('Failed to update study');
    return updatedRealtime;
  }

  async patchVote(start: any, end: any) {
    const todayData = await this.getTodayData();
    try {
      if (start && end && todayData?.userList) {
        todayData.userList.forEach((userInfo) => {
          if (userInfo.user.toString() === this.token.id) {
            userInfo.time.start = start;
            userInfo.time.end = end;
          }
        });

        await todayData.save();
      } else {
        return new Error();
      }
    } catch (err) {
      throw new Error();
    }
  }

  async deleteVote() {
    const todayData = await this.getTodayData();
    try {
      todayData.userList = todayData.userList?.filter(
        (userInfo) => userInfo.user.toString() !== this.token.id,
      );

      await todayData.save();
    } catch (err) {
      throw new Error();
    }
  }
  async patchStatus(status: any) {
    const todayData = await this.getTodayData();

    try {
      todayData.userList?.forEach((userInfo) => {
        if (userInfo.user.toString() === this.token.id) {
          userInfo.status = status;
        }
      });

      await todayData.save();
    } catch (err) {
      throw new Error();
    }
  }
  async patchComment(comment: string) {
    const todayData = await this.getTodayData();

    try {
      todayData.userList?.forEach((userInfo) => {
        if (userInfo.user.toString() === this.token.id) {
          userInfo.comment = userInfo.comment || { text: '' };
          userInfo.comment.text = comment;
        }
      });

      await todayData.save();
    } catch (err) {
      throw new Error();
    }
  }

  // 가장 최근의 스터디 가져오기
  async getRecentStudy() {
    return this.getTodayData();
  }
}
