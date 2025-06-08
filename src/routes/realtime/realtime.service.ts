import { Inject } from '@nestjs/common';
import { CollectionService } from 'src/routes/collection/collection.service';
import ImageService from 'src/imagez/image.service';
import { RequestContext } from 'src/request-context';
import { IUser } from 'src/routes/user/user.entity';
import { UserService } from 'src/routes/user/user.service';
import { DateUtils } from 'src/utils/Date';
import { IREALTIME_REPOSITORY } from 'src/utils/di.tokens';
import { VoteService } from 'src/vote/vote.service';
import { DatabaseError } from '../../errors/DatabaseError'; // 에러 처리 클래스 (커스텀 에러)
import {
  IRealtime,
  IRealtimeUser,
  RealtimeUserZodSchema,
} from './realtime.entity';
import { RealtimeRepository } from './realtime.repository.interface';
import { CONST } from 'src/Constants/CONSTANTS';

export default class RealtimeService {
  constructor(
    @Inject(IREALTIME_REPOSITORY)
    private readonly realtimeRepository: RealtimeRepository,
    private readonly userServiceInstance: UserService,
    private readonly imageServiceInstance: ImageService,
    private readonly voteServiceInstance: VoteService,
    private readonly collectionServiceInstance: CollectionService,
  ) {}

  private getToday() {
    return DateUtils.getTodayYYYYMMDD();
  }

  async getTodayData(date?: string) {
    // const date = this.getToday();
    if (!date) date = this.getToday();
    const data = await this.realtimeRepository.findByDate(date);
    // if (!data) {
    //   return await this.realtimeRepository.createByDate(date);
    // }

    return data;
  }

  //todo: date:YYYYMMDD라 가정
  async createBasicVote(studyData: Partial<IRealtime>, date: string) {
    const token = RequestContext.getDecodedToken();

    // 데이터 유효성 검사
    const validatedUserData = RealtimeUserZodSchema.parse({
      ...studyData,
      status: 'free',
      user: token.id,
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

      const validatedStudy = RealtimeUserZodSchema.parse({
        ...studyData,
        time: studyData.time,
        place: studyData.place,
        arrived: new Date(),
        user: token.id,
      });

      await this.voteServiceInstance.deleteVote(date);

      await this.realtimeRepository.patchAttendance(
        date,
        validatedStudy,
        token.id,
      );

      const result = this.collectionServiceInstance.setCollectionStamp(
        token.id,
      );

      await this.userServiceInstance.updateScore(
        CONST.SCORE.ATTEND_PRIVATE_STUDY,
        '스터디 출석',
      );
      return result;
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
        // `prefix`를 포함한 필드명을 동적으로 설정
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
      if (start && end && todayData?.userList) {
        todayData.userList.forEach((userInfo) => {
          if ((userInfo.user as IUser)._id.toString() === token.id) {
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

  async deleteVote(date: string) {
    const token = RequestContext.getDecodedToken();

    const todayData = await this.getTodayData(date);
    try {
      todayData.userList = todayData.userList?.filter(
        (userInfo) => userInfo.user.toString() !== token.id,
      );

      await todayData.save();
    } catch (err) {
      throw new Error();
    }
  }
  async patchStatus(status: any, date: string) {
    const token = RequestContext.getDecodedToken();

    const todayData = await this.getTodayData(date);

    try {
      todayData.userList?.forEach((userInfo) => {
        if ((userInfo.user as IUser)._id.toString() === token.id) {
          userInfo.status = status;
        }
      });

      await todayData.save();
    } catch (err) {
      throw new Error();
    }
  }
  async patchComment(comment: string, date: string) {
    const token = RequestContext.getDecodedToken();

    const todayData = await this.getTodayData(date);

    try {
      todayData.userList?.forEach((userInfo) => {
        if (userInfo.user.toString() === token.id) {
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
  async getRecentStudy(date: string) {
    return this.getTodayData(date);
  }
}
