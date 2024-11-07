import { InjectModel } from '@nestjs/mongoose';
import dayjs from 'dayjs';
import { Model } from 'mongoose';
import { JWT } from 'next-auth/jwt';
import { IGroupStudyData, subCommentType } from './entity/groupStudy.entity';
import { DatabaseError } from 'src/errors/DatabaseError';
import { IUser } from 'src/user/entity/user.entity';
import { Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { IWebPushService } from 'src/webpush/webpushService.interface';
import {
  ICOUNTER_SERVICE,
  IGROUPSTUDY_REPOSITORY,
  IWEBPUSH_SERVICE,
} from 'src/utils/di.tokens';
import { ICounterService } from 'src/counter/counterService.interface';
import { IGroupStudyService } from './groupStudyService.interface';
import { GroupStudyRepository } from './groupStudy.repository.interface';

export default class GroupStudyService implements IGroupStudyService {
  private token: JWT;
  constructor(
    @Inject(IGROUPSTUDY_REPOSITORY)
    private readonly groupStudyRepository: GroupStudyRepository,
    @InjectModel('User') private User: Model<IUser>,
    @Inject(IWEBPUSH_SERVICE) private webPushServiceInstance: IWebPushService,
    @Inject(ICOUNTER_SERVICE) private counterServiceInstance: ICounterService,
    @Inject(REQUEST) private readonly request: Request, // Request 객체 주입
  ) {
    this.token = this.request.decodedToken;
  }

  async getGroupStudyByFilterAndCategory(
    filter: string,
    category: string,
    cursor: number | null,
  ) {
    let groupStudyData;
    const gap = 8;
    let start = gap * (cursor || 0);

    const filterQuery = { status: filter, 'category.main': category };

    groupStudyData = await this.groupStudyRepository.findByStatusAndCategory(
      filterQuery,
      start,
      gap,
    );

    return groupStudyData;
  }

  async getGroupStudyByFilter(filter: string, cursor: number | null) {
    let groupStudyData;
    const gap = 7;
    let start = gap * (cursor || 0);

    const filterQuery = { status: filter };

    groupStudyData = await this.groupStudyRepository.findByStatusAndCategory(
      filterQuery,
      start,
      gap,
    );

    return groupStudyData;
  }

  async getGroupStudyByCategory(category: string) {
    const groupStudyData =
      await this.groupStudyRepository.findByCategory(category);

    return groupStudyData;
  }

  async getGroupStudyById(groupStudyId: string) {
    const groupStudyIdNum = parseInt(groupStudyId);

    const groupStudyData =
      await this.groupStudyRepository.findByIdWithPop(groupStudyIdNum);

    return groupStudyData;
  }

  async getUserParticipatingGroupStudy() {
    const userParticipatingGroupStudy =
      await this.groupStudyRepository.findByParticipant(this.token.id);

    return userParticipatingGroupStudy;
  }

  async getGroupStudy(cursor: number | null) {
    const gap = 7;
    let start = gap * (cursor || 0);

    const groupStudyData = await this.groupStudyRepository.findAllFilter(
      start,
      gap,
    );

    return groupStudyData;
  }

  async createSubComment(
    groupStudyId: string,
    commentId: string,
    content: string,
  ) {
    const message: subCommentType = {
      user: this.token.id,
      comment: content,
    };

    await this.groupStudyRepository.createSubComment(
      groupStudyId,
      commentId,
      message,
    );

    return;
  }

  async deleteSubComment(
    groupStudyId: string,
    commentId: string,
    subCommentId: string,
  ) {
    await this.groupStudyRepository.deleteSubComment(
      groupStudyId,
      commentId,
      subCommentId,
    );

    return;
  }

  async updateSubComment(
    groupStudyId: string,
    commentId: string,
    subCommentId: string,
    comment: string,
  ) {
    await this.groupStudyRepository.updateSubComment(
      groupStudyId,
      commentId,
      subCommentId,
      comment,
    );
    return;
  }

  //Counter 분리 필요
  async createGroupStudy(data: IGroupStudyData) {
    const nextId =
      await this.counterServiceInstance.getNextSequence('groupStudyId');

    const groupStudyInfo: Partial<IGroupStudyData> = {
      ...data,
      participants: [
        {
          user: data.organizer._id,
          role: 'admin',
          attendCnt: 0,
        },
      ],
      attendance: {
        firstDate: undefined,
        lastWeek: [],
        thisWeek: [],
      },
      id: nextId as number,
    };

    const groupStudyData = groupStudyInfo;

    try {
      await this.groupStudyRepository.createGroupStudy(groupStudyData);
    } catch (err: any) {
      throw new DatabaseError('create groupstury failed');
    }

    return;
  }
  async updateGroupStudy(data: IGroupStudyData) {
    const groupStudy = await this.groupStudyRepository.findById(data.id + '');

    if (!groupStudy) throw new Error();

    try {
      Object.assign(groupStudy, data);
      await groupStudy.save();
    } catch (err: any) {
      throw new Error(err);
    }
  }
  async participateGroupStudy(id: string) {
    const groupStudy = await this.groupStudyRepository.findById(id);

    if (!groupStudy) throw new Error();

    if (
      !groupStudy.participants.some(
        (participant) => participant.user == this.token.id,
      )
    ) {
      groupStudy.participants.push({
        user: this.token.id,
        role: 'member',
        attendCnt: 0,
      });
      groupStudy.attendance.thisWeek.push({
        uid: this.token.uid as string,
        name: this.token.name as string,
        attendRecord: [],
      });
      groupStudy.attendance.lastWeek.push({
        uid: this.token.uid as string,
        name: this.token.name as string,
        attendRecord: [],
      });
      await groupStudy?.save();
    }

    this.webPushServiceInstance.sendNotificationGroupStudy(id);

    return;
  }
  async deleteParticipate(id: string) {
    const groupStudy = await this.groupStudyRepository.findById(id);

    if (!groupStudy) throw new Error();

    try {
      groupStudy.participants = groupStudy.participants.filter(
        (participant) => participant.user != this.token.id,
      );

      groupStudy.attendance.lastWeek = groupStudy.attendance.lastWeek.filter(
        (who) => who.uid !== this.token.uid + '',
      );
      groupStudy.attendance.thisWeek = groupStudy.attendance.thisWeek.filter(
        (who) => who.uid !== this.token.uid + '',
      );
      await groupStudy.save();
    } catch (err) {
      throw new Error();
    }
    return;
  }

  async exileParticipate(id: string, toUid: string, randomId?: number) {
    const groupStudy = await this.groupStudyRepository.findById(id);
    if (!groupStudy) throw new Error();

    try {
      if (!randomId) {
        groupStudy.participants = groupStudy.participants.filter(
          (participant) => participant.user != toUid,
        );

        groupStudy.attendance.lastWeek = groupStudy.attendance.lastWeek.filter(
          (who) => who.uid !== toUid + '',
        );
        groupStudy.attendance.thisWeek = groupStudy.attendance.thisWeek.filter(
          (who) => who.uid !== toUid + '',
        );
      } else {
        groupStudy.participants = groupStudy.participants.filter(
          (participant) => participant.randomId !== randomId,
        );
      }
      await groupStudy.save();
    } catch (err) {
      throw new Error();
    }
    return;
  }

  async getWaitingPerson(id: string) {
    const data = await this.groupStudyRepository.findByIdWithWaiting(id);

    return data;
  }

  async setWaitingPerson(id: string, pointType: string, answer?: string) {
    const groupStudy = await this.groupStudyRepository.findById(id);
    if (!groupStudy) throw new Error();

    try {
      const user = { user: this.token.id, answer, pointType };
      if (groupStudy?.waiting) {
        if (groupStudy.waiting.includes(user)) {
          return;
        }
        groupStudy.waiting.push(user);
      } else {
        groupStudy.waiting = [user];
      }
      await groupStudy?.save();
    } catch (err) {
      throw new Error();
    }
  }

  //randomId 중복가능성
  async agreeWaitingPerson(id: string, userId: string, status: string) {
    const groupStudy = await this.groupStudyRepository.findById(id);
    if (!groupStudy) throw new Error();

    try {
      groupStudy.waiting = groupStudy.waiting.filter(
        (who) => who.user.toString() !== userId,
      );
      if (status === 'agree') {
        groupStudy.participants.push({
          user: userId,
          role: userId ? 'member' : 'outsider',
          attendCnt: 0,
          randomId: userId ? undefined : Math.floor(Math.random() * 100000),
        });
      }

      await groupStudy?.save();
    } catch (err) {
      throw new Error();
    }
  }

  async getAttendanceGroupStudy(id: string): Promise<any> {
    const groupStudy = await this.groupStudyRepository.findById(id);
    if (!groupStudy) throw new DatabaseError();

    return groupStudy.attendance;
  }

  async patchAttendanceWeek(id: string) {
    const groupStudy = await this.groupStudyRepository.findById(id);
    if (!groupStudy) throw new Error();

    const firstDate = dayjs()
      .subtract(1, 'day')
      .startOf('week')
      .add(1, 'day')
      .format('YYYY-MM-DD');

    groupStudy.attendance.firstDate = firstDate;
    groupStudy.attendance.lastWeek = groupStudy.attendance.thisWeek;
    groupStudy.attendance.thisWeek = [];

    await groupStudy.save();
  }
  async attendGroupStudy(
    id: string,
    weekRecord: string[],
    type: string,
    weekRecordSub?: string[],
  ) {
    const groupStudy = await this.groupStudyRepository.findById(id);
    if (!groupStudy) throw new Error();

    try {
      const firstDate = dayjs()
        .subtract(1, 'day')
        .startOf('week')
        .add(1, 'day')
        .format('YYYY-MM-DD');

      if (type === 'this') groupStudy.attendance.firstDate = firstDate;

      const weekData =
        type === 'this'
          ? groupStudy.attendance.thisWeek
          : groupStudy.attendance.lastWeek;

      const findUser = weekData.find((who) => who.uid === this.token.uid + '');
      const findMember = groupStudy.participants.find(
        (who) => who.user.toString() === (this.token.id as string),
      );

      if (findUser) {
        const beforeCnt = findUser.attendRecord.length;
        if (findMember) {
          findMember.attendCnt += -beforeCnt + weekRecord.length;
        }
        findUser.attendRecord = weekRecord;
        findUser.attendRecordSub = weekRecordSub;
      } else {
        const data = {
          name: this.token.name as string,
          uid: this.token.uid as string,
          attendRecord: weekRecord,
          attendRecordSub: weekRecordSub,
        };
        if (findMember) {
          findMember.attendCnt += weekRecord.length;
        }
        if (type === 'this') {
          groupStudy.attendance.thisWeek.push(data);
        }
        if (type === 'last') groupStudy.attendance.lastWeek.push(data);
      }

      await groupStudy?.save();

      return;
    } catch (err) {
      throw new Error();
    }
  }

  async createComment(groupStudyId: string, comment: string) {
    const groupStudy = await this.groupStudyRepository.findById(groupStudyId);
    if (!groupStudy) throw new DatabaseError('wrong groupStudyId');

    if (groupStudy?.comments) {
      groupStudy.comments.push({
        user: this.token.id,
        comment,
      });
    } else {
      groupStudy.comments = [
        {
          user: this.token.id,
          comment,
        },
      ];
    }

    await groupStudy.save();
  }

  //comment방식 바꾸기
  async deleteComment(groupStudyId: string, commentId: string) {
    const groupStudy = await this.groupStudyRepository.findById(groupStudyId);
    if (!groupStudy) throw new DatabaseError('wrong groupStudyId');

    groupStudy.comments = groupStudy.comments.filter(
      (com: any) => (com._id as string) != commentId,
    );

    await groupStudy.save();
  }

  async patchComment(groupStudyId: string, commentId: string, comment: string) {
    const groupStudy = await this.groupStudyRepository.findById(groupStudyId);
    if (!groupStudy) throw new DatabaseError('wrong groupStudyId');

    groupStudy.comments.forEach(async (com: any) => {
      if ((com._id as string) == commentId) {
        com.comment = comment;
        await groupStudy.save();
      }
    });
    return;
  }

  async createCommentLike(groupStudyId: number, commentId: string) {
    const feed = await this.groupStudyRepository.createCommentLike(
      groupStudyId,
      commentId,
      this.token.id,
    );

    if (!feed) {
      throw new DatabaseError('해당 Id 또는 commentId를 찾을 수 없습니다.');
    }
  }

  async createSubCommentLike(
    groupStudyId: number,
    commentId: string,
    subCommentId: string,
  ) {
    const groupStudy = await this.groupStudyRepository.createSubCommentLike(
      groupStudyId,
      commentId,
      subCommentId,
      this.token.id,
    );

    if (!groupStudy) {
      throw new DatabaseError('해당 feedId 또는 commentId를 찾을 수 없습니다.');
    }
    return;
  }

  async belongToParticipateGroupStudy() {
    const groupStudies = await this.groupStudyRepository.findAll();
    const allUser = await this.User.find({ isActive: true });
    if (!groupStudies) throw new Error();

    const checkGroupBelong = (hashArr: string) => {
      let belong;
      hashArr?.split('#').forEach((hash) => {
        // 해시태그에서 불필요한 공백 제거
        const trimmedHash = hash.trim();
        if (/[A-Z]/.test(trimmedHash)) {
          belong = trimmedHash;
          return;
        }
      });
      return belong;
    };

    try {
      let a = 'test';
      let b = 'test2';
      let c = 'test3';

      groupStudies.forEach(async (group) => {
        const belong = checkGroupBelong(group.hashTag);
        if (!belong || belong == 'C++') return;
        if (belong) a = belong as unknown as string;

        allUser.forEach(async (who) => {
          if (who?.belong) c = who.belong;
          if (
            belong &&
            who?.belong &&
            who.belong.length > 2 &&
            who.belong === belong
          ) {
            b = belong;
            if (
              !group.participants.some(
                (participant) => participant.user == who._id,
              )
            ) {
              await group.participants.push({
                user: who?._id,
                role: 'member',
                attendCnt: 0,
              });
              await group.attendance.thisWeek.push({
                uid: who?.uid,
                name: who?.name,
                attendRecord: [],
              });
              await group.attendance.lastWeek.push({
                uid: who?.uid,
                name: who?.name,
                attendRecord: [],
              });
            }
          }
        });

        await group.save();
      });
      return { a, b, allUser };
    } catch (err) {
      throw new Error();
    }
  }
}
