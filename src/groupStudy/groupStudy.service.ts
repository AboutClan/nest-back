import { HttpException, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import dayjs from 'dayjs';
import { Model } from 'mongoose';
import {
  GROUP_WEEKLY_PARTICIPATE_POINT,
  GROUPSTUDY_FIRST_COMMENT,
} from 'src/Constants/point';
import { DatabaseError } from 'src/errors/DatabaseError';
import { IUser } from 'src/user/user.entity';
import { IGROUPSTUDY_REPOSITORY } from 'src/utils/di.tokens';
import { IGroupStudyData, subCommentType } from './groupStudy.entity';
import { GroupStudyRepository } from './groupStudy.repository.interface';
import { CounterService } from 'src/counter/counter.service';
import { UserService } from 'src/user/user.service';
import { WebPushService } from 'src/webpush/webpush.service';
import { RequestContext } from 'src/request-context';
import { GROUPSTUDY_FULL_DATA, REDIS_CLIENT } from 'src/redis/keys';
import Redis from 'ioredis';
import * as zlib from 'zlib';
import { promisify } from 'util';

//test
export default class GroupStudyService {
  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redisClient: Redis,
    @Inject(IGROUPSTUDY_REPOSITORY)
    private readonly groupStudyRepository: GroupStudyRepository,
    private readonly userServiceInstance: UserService,
    @InjectModel('User') private User: Model<IUser>,
    private webPushServiceInstance: WebPushService,
    private readonly counterServiceInstance: CounterService,
  ) {}
  async getStatusGroupStudy(cursor: number, status: string) {
    switch (status) {
      case 'isParticipating':
        return this.getMyOpenGroupStudy(cursor);
      case 'isEnded':
        return this.getMyFinishGroupStudy(cursor);
      case 'isOwner':
        return this.getMyGroupStudy(cursor);
      default:
        break;
    }
  }

  async getMyOpenGroupStudy(cursor: number | null) {
    const token = RequestContext.getDecodedToken();

    const gap = 12;
    let start = gap * (cursor || 0);

    const filterQuery = {
      $and: [
        {
          participants: {
            $elemMatch: { user: token.id },
          },
        },
        { status: 'pending' },
      ],
    };

    let gatherData = await this.groupStudyRepository.findWithQueryPopPage(
      filterQuery,
      start,
      gap,
    );

    return gatherData;
  }

  async getMyFinishGroupStudy(cursor: number | null) {
    const token = RequestContext.getDecodedToken();

    const gap = 12;
    let start = gap * (cursor || 0);

    const filterQuery = {
      $and: [
        {
          participants: {
            $elemMatch: { user: token.id },
          },
        },
        { status: { $ne: 'pending' } },
        ,
      ],
    };

    let gatherData = await this.groupStudyRepository.findWithQueryPopPage(
      filterQuery,
      start,
      gap,
    );

    return gatherData;
  }

  async getMyGroupStudy(cursor: number | null) {
    const token = RequestContext.getDecodedToken();

    const gap = 12;
    let start = gap * (cursor || 0);

    const filterQuery = {
      organizer: token.id,
    };
    let gatherData = await this.groupStudyRepository.findWithQueryPopPage(
      filterQuery,
      start,
      gap,
    );

    return gatherData;
  }

  //갱신
  async getGroupStudyOnlyStudy() {
    let groupStudyData;

    const filterQuery = { status: 'study' };

    groupStudyData = await this.groupStudyRepository.findWithQueryPopPage(
      filterQuery,
      0,
      Infinity,
    );

    return {
      study: groupStudyData,
    };
  }
  async getGroupStudySnapshot() {
    const gzip = promisify(zlib.gzip);
    const gunzip = promisify(zlib.gunzip);

    let groupStudyData;

    const filterQuery = { status: { $in: ['pending', 'planned'] } };

    groupStudyData = await this.redisClient.get(GROUPSTUDY_FULL_DATA);

    if (groupStudyData) {
      return await JSON.parse(
        (await gunzip(Buffer.from(groupStudyData, 'base64'))).toString(),
      );
    }

    groupStudyData = await this.groupStudyRepository.findWithQueryPopPage(
      filterQuery,
      0,
      Infinity,
    );

    groupStudyData = groupStudyData.sort(() => Math.random() - 0.5);

    const filterGroupStudies = (data, type, status) => {
      return data
        .filter((groupStudy) => {
          const typeMatches = !type || groupStudy.category.main === type;

          const statusMatches = (() => {
            if (!status) return true;
            if (status === 'planned') {
              return (
                groupStudy.status === 'pending' &&
                groupStudy.participants.length <= 2
              );
            }
            if (status === 'pending') {
              return (
                groupStudy.status === 'pending' &&
                groupStudy.participants.length > 2
              );
            }
            return groupStudy.status === status;
          })();

          return statusMatches && typeMatches;
        })
        .slice(0, type === '취미' ? 6 : 3);
    };

    const returnVal = {
      hobby: filterGroupStudies(groupStudyData, '취미', 'pending'),
      development: filterGroupStudies(groupStudyData, '자기계발', 'pending'),
      study: filterGroupStudies(groupStudyData, '성장 스터디', 'pending'),
      exam: filterGroupStudies(groupStudyData, '시험 스터디', 'pending'),
      waiting: filterGroupStudies(groupStudyData, null, 'planned'),
    };
    this.redisClient.set(
      GROUPSTUDY_FULL_DATA,
      (await gzip(JSON.stringify(returnVal))).toString('base64'),
      'EX',
      10,
    );

    return returnVal;
  }

  async getGroupStudyByFilterAndCategory(
    filter: string,
    category: string,
    cursor: number | null,
  ) {
    let groupStudyData;
    const gap = 8;
    let start = gap * (cursor || 0);

    const filterQuery = {
      status: filter,
      'category.main': category,
    };

    groupStudyData = await this.groupStudyRepository.findWithQueryPopPage(
      filterQuery,
      start,
      gap,
    );

    const shuffledGroups = groupStudyData.sort(() => Math.random() - 0.5);

    return shuffledGroups;
  }

  async getUserGroupsTitleByUserId(userId: string) {
    return await this.groupStudyRepository.getUserGroupsTitleByUserId(userId);
  }

  async getSigningGroupByStatus(status: string) {
    const token = RequestContext.getDecodedToken();
    return await this.groupStudyRepository.getSigningGroupByStatus(
      token.id,
      status,
    );
  }

  async getGroupStudyByFilter(filter: string, cursor: number | null) {
    let groupStudyData;
    const gap = 8;
    let start = gap * (cursor || 0);

    const filterQuery = {
      status: filter === 'planned' ? 'pending' : filter,

      ...((filter === 'planned' || filter === 'pending') && {
        $expr: {
          [filter === 'planned' ? '$lte' : '$gt']: [
            { $size: '$participants' },
            2,
          ],
        },
      }), // 배열 길이 조건 추가
    };

    groupStudyData = await this.groupStudyRepository.findWithQueryPopPage(
      filterQuery,
      start,
      gap,
    );

    const shuffledGroups = groupStudyData.sort(() => Math.random() - 0.5);

    return shuffledGroups;
  }

  async getGroupStudyByCategory(category: string) {
    const filterQuery = {
      'category.main': category,
    };
    const groupStudyData =
      await this.groupStudyRepository.findWithQueryPopPage(filterQuery);

    return groupStudyData;
  }

  async getGroupStudyById(groupStudyId: string) {
    const groupStudyIdNum = parseInt(groupStudyId);

    const groupStudyData =
      await this.groupStudyRepository.findByIdWithPop(groupStudyIdNum);

    return groupStudyData;
  }

  async getUserParticipatingGroupStudy() {
    const token = RequestContext.getDecodedToken();

    const query = {
      'participants.user': token.id as string,
    };

    const userParticipatingGroupStudy =
      await this.groupStudyRepository.findWithQueryPopPage(query);

    return userParticipatingGroupStudy;
  }

  async getGroupStudy(cursor: number | null) {
    const gap = 7;
    let start = gap * (cursor || 0);

    const groupStudyData = await this.groupStudyRepository.findWithQueryPopPage(
      null,
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
    const token = RequestContext.getDecodedToken();

    const message: subCommentType = {
      user: token.id,
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

  async createGroupStudy(data: IGroupStudyData) {
    const token = RequestContext.getDecodedToken();

    try {
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
        organizer: token.id,
        id: nextId as number,
      };

      const groupStudyData = groupStudyInfo;

      await this.groupStudyRepository.createGroupStudy(groupStudyData);

      return;
    } catch (err) {
      console.log(err);
    }
  }
  async updateGroupStudy(data: IGroupStudyData) {
    const groupStudy = await this.groupStudyRepository.findById(data.id + '');

    if (!groupStudy) throw new Error();

    try {
      const { organizer, ...updatedData } = data;
      Object.assign(groupStudy, updatedData);
      await groupStudy.save();
    } catch (err: any) {
      throw new Error(err);
    }
  }

  //todo: 테스트 필요
  //todo: 수정도 필요
  async participateGroupStudy(id: string) {
    const token = RequestContext.getDecodedToken();

    const groupStudy = await this.groupStudyRepository.findById(id);

    if (!groupStudy) throw new Error();

    if (
      !groupStudy.participants.some(
        (participant) => participant.user == token.id,
      )
    ) {
      await this.groupStudyRepository.addParticipantWithAttendance(
        id,
        token.id,
        token.name,
        token.uid,
      );
    }

    //ticket 차감 로직
    const ticketInfo = await this.userServiceInstance.getTicketInfo(token.id);

    if (ticketInfo.groupStudyTicket <= 0) throw new Error('no ticket');

    await this.userServiceInstance.updateReduceTicket('groupOffline', token.id);

    await this.webPushServiceInstance.sendNotificationGroupStudy(
      id,
      `${token.name} 님이 소모임에 가입했어요! 환영해 주세요!`,
    );
    await this.webPushServiceInstance.sendNotificationToXWithId(
      groupStudy.organizer,
      `${token.name} 님이 소모임에 가입했어요! 환영해 주세요!`,
      '접속하여 확인하세요!',
    );

    return;
  }

  async inviteGroupStudy(id: string, userId: string) {
    const groupStudy = await this.groupStudyRepository.findById(id);
    const user = await this.userServiceInstance.getUserWithUserId(userId);
    if (!groupStudy) throw new Error();

    //ticket 차감 로직
    const ticketInfo = await this.userServiceInstance.getTicketInfo(user.id);
    if (ticketInfo.groupStudyTicket <= 0) throw new Error('no ticket');

    if (
      !groupStudy.participants.some(
        (participant) => participant.user == user.id,
      )
    ) {
      await this.groupStudyRepository.addParticipantWithAttendance(
        id,
        user._id,
        user.name,
        user.uid,
      );
    }

    await this.userServiceInstance.updateReduceTicket('groupOffline', user.id);

    await this.webPushServiceInstance.sendNotificationGroupStudy(
      id,
      `${user.name} 님이 소모임에 가입했어요! 환영해 주세요!`,
    );
    await this.webPushServiceInstance.sendNotificationToXWithId(
      groupStudy.organizer,
      `${user.name} 님이 소모임에 가입했어요! 환영해 주세요!`,
      '접속하여 확인하세요!',
    );

    return;
  }

  async deleteParticipate(id: string) {
    const token = RequestContext.getDecodedToken();
    const groupStudy = await this.groupStudyRepository.findById(id);

    if (!groupStudy) throw new Error();

    try {
      groupStudy.participants = groupStudy.participants.filter(
        (participant) => participant.user != token.id,
      );

      groupStudy.attendance.lastWeek = groupStudy.attendance.lastWeek.filter(
        (who) => who.uid !== token.uid + '',
      );
      groupStudy.attendance.thisWeek = groupStudy.attendance.thisWeek.filter(
        (who) => who.uid !== token.uid + '',
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
    const token = RequestContext.getDecodedToken();

    const groupStudy = await this.groupStudyRepository.findById(id);
    if (!groupStudy) throw new Error();

    try {
      const user = { user: token.id, answer, pointType };
      if (groupStudy?.waiting) {
        if (groupStudy.waiting.includes(user)) {
          return;
        }
        groupStudy.waiting.push(user);
      } else {
        groupStudy.waiting = [user];
      }
      await groupStudy?.save();

      await this.webPushServiceInstance.sendNotificationToXWithId(
        groupStudy.organizer,
        '누군가 소모임에 가입했어요',
        '접속하여 확인하세요!',
      );
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

        //ticket 소모 로직
        const ticketInfo = await this.userServiceInstance.getTicketInfo(userId);
        if (groupStudy.meetingType !== 'online') {
          if (ticketInfo.groupStudyTicket <= 1)
            throw new HttpException('no ticket', 500);
          this.userServiceInstance.updateReduceTicket('groupOffline', userId);
        } else {
          if (ticketInfo.groupStudyTicket <= 0)
            throw new HttpException('no ticket', 500);
          this.userServiceInstance.updateReduceTicket('groupOnline', userId);
        }
        await groupStudy?.save();

        //알림
        await this.webPushServiceInstance.sendNotificationGroupStudy(
          id,
          `누군가 소모임에 가입했어요! 환영해 주세요!`,
        );

        await this.webPushServiceInstance.sendNotificationToXWithId(
          userId,
          '소모임 참여가 승인됐어요! 이제 함께할 수 있어요.',
          '접속하여 확인하세요!',
        );
      }
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
    const token = RequestContext.getDecodedToken();

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

      const findUser = weekData.find((who) => who.uid === token.uid + '');
      const findMember = groupStudy.participants.find(
        (who) => who.user.toString() === (token.id as string),
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
          name: token.name as string,
          uid: token.uid as string,
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
    const token = RequestContext.getDecodedToken();

    const groupStudy = await this.groupStudyRepository.findById(groupStudyId);
    if (!groupStudy) throw new DatabaseError('wrong groupStudyId');

    if (groupStudy?.comments) {
      groupStudy.comments.push({
        user: token.id,
        comment,
      });
    } else {
      await this.userServiceInstance.updatePoint(
        GROUPSTUDY_FIRST_COMMENT,
        '소모임 최초 리뷰 작성',
        token.uid,
      );
      groupStudy.comments = [
        {
          user: token.id,
          comment,
        },
      ];
    }

    await this.webPushServiceInstance.sendNotificationToXWithId(
      groupStudy.organizer,
      `[${groupStudy.title}] 게시글에 새로운 댓글이 달렸어요.`,
      '접속하여 확인하세요!',
    );

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
    const token = RequestContext.getDecodedToken();

    const feed = await this.groupStudyRepository.createCommentLike(
      groupStudyId,
      commentId,
      token.id,
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
    const token = RequestContext.getDecodedToken();

    const groupStudy = await this.groupStudyRepository.createSubCommentLike(
      groupStudyId,
      commentId,
      subCommentId,
      token.id,
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

  async weekAttend(groupId: string, userId: string) {
    const result = await this.groupStudyRepository.weekAttendance(
      groupId,
      userId,
    );

    if (result.modifiedCount) {
      await this.userServiceInstance.updatePointWithUserId(
        userId,
        GROUP_WEEKLY_PARTICIPATE_POINT,
        '소모임 주간 출석',
      );
    }
    return;
  }

  async initWeekAttend() {
    await this.groupStudyRepository.initWeekAttendance();
    return;
  }

  async getEnthMembers() {
    return await this.groupStudyRepository.findEnthMembers();
  }

  async getComment(type: 'mine' | 'others', cursor: number) {
    const token = RequestContext.getDecodedToken();

    const groupStudies =
      await this.groupStudyRepository.findMyGroupStudyComment(token.id);

    const commentArr = [];

    groupStudies.forEach((groupStudy) => {
      commentArr.push(...groupStudy.comments);
    });

    let usedComment;
    if (type == 'mine') {
      usedComment = commentArr.filter((comment) => comment.user == token.id);
    } else {
      usedComment = commentArr.filter((comment) => comment.user != token.id);
    }

    return usedComment;
  }

  async test() {
    return await this.groupStudyRepository.test();
  }
}
