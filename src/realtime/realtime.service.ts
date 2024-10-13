import { JWT } from 'next-auth/jwt';
import { DatabaseError } from '../errors/DatabaseError'; // 에러 처리 클래스 (커스텀 에러)
import ImageService from 'src/imagez/image.service';
import { Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { InjectModel } from '@nestjs/mongoose';
import {
  IPlace,
  IRealtime,
  IRealtimeUser,
  RealtimeUserZodSchema,
} from './realtime.entity';
import { Model } from 'mongoose';
import { VoteService } from 'src/vote/vote.service';
import { IUser } from 'src/user/entity/user.entity';
import { CollectionService } from 'src/collection/collection.service';

export default class RealtimeService {
  private token: JWT;

  constructor(
    @InjectModel('Realtime') private RealtimeModel: Model<IRealtime>,
    private readonly imageServiceInstance: ImageService,
    private readonly voteServiceInstance: VoteService,
    private readonly collectionServiceInstance: CollectionService,
    @Inject(REQUEST) private readonly request: Request, // Request 객체 주입
  ) {
    this.token = this.request.decodedToken;
  }

  getToday() {
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0); // 시간을 0시 0분 0초 0밀리초로 설정
    return todayMidnight;
  }

  async getTodayData() {
    const date = this.getToday();
    const data = await this.RealtimeModel.findOne({ date });

    if (!data) {
      return await this.RealtimeModel.create({ date });
    }

    return data;
  }

  // 기본 투표 생성
  async createBasicVote(studyData: Partial<IRealtime>) {
    console.log(studyData);
    const todayData = await this.getTodayData();

    const isVoting = await this.voteServiceInstance.isVoting(
      this.getToday(),
      this.token.id,
    );

    if (isVoting) {
      const vote = await this.voteServiceInstance.getVote(this.getToday());
      vote.participations = vote.participations.map((participation) => ({
        ...participation,
        attendences: participation.attendences?.filter((attandence) => {
          return (
            (attandence.user as IUser)?.uid.toString() !==
            this.token.uid?.toString()
          );
        }),
      }));
      await vote.save();
    }

    if (todayData?.userList) {
      todayData.userList = todayData.userList.filter(
        (user) => user.user.toString() !== this.token.id,
      );
    }
    // 데이터 유효성 검사
    const validatedStudy = RealtimeUserZodSchema.parse({
      ...studyData,
      status: 'pending',
      user: this.token.id,
    });

    const isDuplicate = todayData.userList?.some(
      (item) => item.user == validatedStudy.user,
    );

    if (!isDuplicate) {
      await todayData.userList?.push(validatedStudy as IRealtimeUser);
      await todayData.save();
    }

    return todayData;
  }

  //todo: 수정 급함
  async markAttendance(studyData: Partial<IRealtimeUser>, buffers: Buffer[]) {
    const todayData = await this.getTodayData();
    const isVoting = await this.voteServiceInstance.isVoting(
      this.getToday(),
      this.token.id,
    );

    if (buffers.length && studyData?.image) {
      const images = await this.imageServiceInstance.uploadImgCom(
        'studyAttend',
        buffers,
      );

      studyData.image = images;
    }

    const validatedStudy = RealtimeUserZodSchema.parse({
      ...studyData,
      time: JSON.parse(studyData.time as unknown as string),
      place: JSON.parse(studyData.place as unknown as string),
      arrived: new Date(),
      user: this.token.id,
    });

    if (isVoting) {
      const vote = await this.voteServiceInstance.getVote(this.getToday());
      vote.participations = vote.participations.map((participation) => ({
        ...participation,
        attendences: participation.attendences?.filter((attandence) => {
          return (
            (attandence.user as IUser)?.uid.toString() !==
            this.token.uid?.toString()
          );
        }),
      }));
      await vote.save();
    }

    let hasPrevVote = false;
    if (todayData?.userList) {
      todayData.userList.forEach((user, index) => {
        if (user.user.toString() === this.token.id) {
          const place = JSON.parse(
            studyData.place as unknown as string,
          ) as IPlace;
          if (user.place.address !== place.address) {
            todayData.userList?.splice(index, 1);
          } else {
            hasPrevVote = true;

            user.arrived = new Date();
            user.status = studyData.status || 'solo';
            user.image = studyData.image;
            user.memo = studyData.memo;
            user.place = place;
            if (studyData?.time)
              user.time = JSON.parse(studyData.time as unknown as string);
          }
        }
      });
    }

    if (!hasPrevVote) {
      await todayData.userList?.push(validatedStudy as IRealtimeUser);
      await todayData.save();
    }

    await todayData.save();
    const result = this.collectionServiceInstance.setCollectionStamp(
      this.token.id,
    );

    return result;
  }

  // 정보를 포함한 직접 출석
  async directAttendance(studyData: Partial<IRealtimeUser>, buffers: Buffer[]) {
    const isVoting = await this.voteServiceInstance.isVoting(
      this.getToday(),
      this.token.id,
    );

    // 데이터 유효성 검사
    const validatedStudy = RealtimeUserZodSchema.parse({
      ...studyData,
      time: JSON.parse(studyData.time as unknown as string),
      place: JSON.parse(studyData.place as unknown as string),
      arrived: new Date(),
      user: this.token.id,
    });

    const todayData = await this.getTodayData();

    if (buffers.length) {
      const images = await this.imageServiceInstance.uploadImgCom(
        'studyAttend',
        buffers,
      );

      studyData.image = images;
    }

    if (isVoting) {
      const vote = await this.voteServiceInstance.getVote(this.getToday());
      vote.participations = vote.participations.map((participation) => ({
        ...participation,
        attendences: participation.attendences?.filter((attandence) => {
          return (
            (attandence.user as IUser)?.uid.toString() !==
            this.token.uid?.toString()
          );
        }),
      }));
      await vote.save();
    }

    if (todayData?.userList) {
      todayData.userList.forEach((user, index) => {
        if ((user.user as unknown as String) == this.token.id) {
          if (user.place._id !== studyData.place?._id) {
            todayData.userList?.splice(index, 1);
          }
        }
      });
    }

    await todayData.userList?.push(validatedStudy as IRealtimeUser);
    await todayData.save();

    const result = this.collectionServiceInstance.setCollectionStamp(
      this.token.id,
    );
    return result;

    // return todayData;
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

    const updatedRealtime = await this.RealtimeModel.findOneAndUpdate(
      {
        date: this.getToday(), // date 필드가 일치하는 문서 찾기
        'userList.user': this.token.id, // userList 배열 내의 user 필드가 일치하는 문서 찾기
      },
      {
        $set: updateFields,
      },
      {
        arrayFilters: [{ 'elem.user': this.token.id }], // 배열 필터: user 필드가 일치하는 요소만 업데이트
        new: true, // 업데이트된 문서를 반환
      },
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
        if (
          userInfo.user.toString() === this.token.id &&
          userInfo.comment?.text
        ) {
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
