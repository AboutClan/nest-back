import { HttpException, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import Redis from 'ioredis';
import { Model } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { WEBPUSH_MSG } from 'src/Constants/WEBPUSH_MSG';
import { GroupStudy, GroupStudyProps } from 'src/domain/entities/GroupStudy';
import { DatabaseError } from 'src/errors/DatabaseError';
import { GROUPSTUDY_FULL_DATA, REDIS_CLIENT } from 'src/redis/keys';
import { RequestContext } from 'src/request-context';
import { CounterService } from 'src/routes/counter/counter.service';
import { IUser } from 'src/routes/user/user.entity';
import { UserService } from 'src/routes/user/user.service';
import { WebPushService } from 'src/routes/webpush/webpush.service';
import { DateUtils } from 'src/utils/Date';
import { IGROUPSTUDY_REPOSITORY } from 'src/utils/di.tokens';
import { promisify } from 'util';
import * as zlib from 'zlib';
import CommentService from '../comment/comment.service';
import { FcmService } from '../fcm/fcm.service';
import { IGroupStudyData } from './groupStudy.entity';
import { IGroupStudyRepository } from './GroupStudyRepository.interface';
import { AppError } from 'src/errors/AppError';

//test
export default class GroupStudyService {
  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redisClient: Redis,
    @Inject(IGROUPSTUDY_REPOSITORY)
    private readonly groupStudyRepository: IGroupStudyRepository,
    private readonly userServiceInstance: UserService,
    @InjectModel(DB_SCHEMA.USER) private User: Model<IUser>,
    private webPushServiceInstance: WebPushService,
    private readonly counterServiceInstance: CounterService,
    private readonly fcmServiceInstance: FcmService,
    private readonly commentService: CommentService,
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
    const start = gap * (cursor || 0);

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

    const gatherData = await this.groupStudyRepository.findWithQueryPopPage(
      filterQuery,
      start,
      gap,
    );

    return gatherData;
  }

  async getMyFinishGroupStudy(cursor: number | null) {
    const token = RequestContext.getDecodedToken();

    const gap = 12;
    const start = gap * (cursor || 0);

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

    const gatherData = await this.groupStudyRepository.findWithQueryPopPage(
      filterQuery,
      start,
      gap,
    );

    return gatherData;
  }

  async getMyGroupStudy(cursor: number | null) {
    const token = RequestContext.getDecodedToken();

    const gap = 12;
    const start = gap * (cursor || 0);

    const filterQuery = {
      organizer: token.id,
      status: 'pending',
    };

    const gatherData = await this.groupStudyRepository.findWithQueryPopPage(
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

    try {
      groupStudyData = await this.redisClient.get(GROUPSTUDY_FULL_DATA);
    } catch (error) {
      // Redis 연결이 안 되어 있거나 장애가 있을 경우
      console.error('Redis 연결 에러:', error);
      groupStudyData = null;
    }

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

    const suffleArray = (array: any[]) => {
      return array.sort(() => Math.random() - 0.5);
    };

    const hobbyData = suffleArray(
      groupStudyData.filter((group) => {
        if (
          [
            '소셜 게임',
            '감상',
            '운동',
            '푸드',
            '힐링',
            '친목',
            '파티',
            '기타',
          ].includes(group.category.main)
        ) {
          return group.status === 'pending' && group.participants.length > 2;
        }
      }),
    );

    const developData = suffleArray(
      groupStudyData.filter((group) => {
        if (['스터디', '자기계발', '말하기'].includes(group.category.main)) {
          return group.status === 'pending' && group.participants.length > 2;
        }
      }),
    );

    const waitingData = suffleArray(
      groupStudyData.filter((group) => {
        return group.status === 'pending' && group.participants.length < 2;
      }),
    );

    const returnVal = {
      hobby: hobbyData.slice(0, 6),
      develop: developData.slice(0, 6),
      waiting: waitingData.slice(0, 6),
    };

    this.redisClient.set(
      GROUPSTUDY_FULL_DATA,
      (await gzip(JSON.stringify(returnVal))).toString('base64'),
      'EX',
      60 * 30,
    );

    return returnVal;
  }

  async getGroupStudyByFilterAndCategory(
    filter: string,
    category: string,
    cursor: number | null,
  ) {
    let groupStudyData;
    //임시 수정 cursor을 프론트에서 우선 제거했음
    const gap = 12;
    const start = gap * (cursor || 0);

    const categoryMapping = {
      '공부 · 자기계발': ['스터디', '자기계발', '말하기'],
      '영화 · 전시 · 공연': ['감상'],
      '소셜 게임': ['소셜 게임'],
      스포츠: ['운동'],
      '취미 · 창작': ['힐링'],
      푸드: ['푸드'],
      친목: ['친목', '파티'],
    };

    const filterQuery: any = {
      'category.main': { $in: categoryMapping[category] },
      $expr: { $gt: [{ $size: '$participants' }, 1] },
    };

    if (filter === 'pending') {
      filterQuery.status = { $in: ['pending', 'resting'] };
    } else {
      filterQuery.status = filter;
    }

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

  async getMyNextTicket(userId: string) {
    const gs =
      await this.groupStudyRepository.getUserGroupsTitleByUserId(userId);
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
    const start = gap * (cursor || 0);

    const filterQuery = {
      status:
        filter === 'planned'
          ? 'pending'
          : filter === 'pending'
            ? { $in: ['pending', 'resting'] }
            : filter,

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

    const comments = await this.commentService.findCommentsByPostId(
      groupStudyData._id?.toString(),
    );

    return { ...groupStudyData, comments };
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
    const start = gap * (cursor || 0);

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

    const groupStudy = await this.groupStudyRepository.findById(groupStudyId);

    await this.commentService.createSubComment({
      postId: groupStudy._id.toString(),
      postType: 'groupStudy',
      user: token.id,
      comment: content,
      parentId: commentId,
    });

    return;
  }

  async deleteSubComment(
    groupStudyId: string,
    commentId: string,
    subCommentId: string,
  ) {
    await this.commentService.deleteComment({ commentId: subCommentId });

    return;
  }

  async updateSubComment(
    groupStudyId: string,
    commentId: string,
    subCommentId: string,
    comment: string,
  ) {
    await this.commentService.updateComment({
      commentId: subCommentId,
      content: comment,
    });
    return;
  }

  async createGroupStudy(data: Partial<IGroupStudyData>) {
    const token = RequestContext.getDecodedToken();

    try {
      const nextId =
        await this.counterServiceInstance.getNextSequence('groupStudyId');

      const groupStudyInfo = {
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
      } as unknown as Partial<GroupStudyProps>;

      const groupStudyData = new GroupStudy(groupStudyInfo);

      await this.groupStudyRepository.create(groupStudyData);

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

      const updatedGroupStudy = new GroupStudy(groupStudy);

      await this.groupStudyRepository.save(updatedGroupStudy);
    } catch (err: any) {
      throw new Error(err);
    }
  }

  //todo: 테스트 필요
  //todo: 수정도 필요
  async participateGroupStudy(id: string) {
    const token = RequestContext.getDecodedToken();

    //ticket 차감 로직
    const ticketInfo = await this.userServiceInstance.getTicketInfo(token.id);
    if (ticketInfo.groupStudyTicket <= 0) throw new Error('no ticket');

    const groupStudy = await this.groupStudyRepository.findById(id);
    if (!groupStudy) throw new Error();
    groupStudy.participateGroupStudy(token.id, 'member');

    //ticket 차감 로직
    await this.userServiceInstance.updateReduceTicket(
      'group',
      token.id,
      -groupStudy.requiredTicket,
    );

    await this.groupStudyRepository.save(groupStudy);

    await this.webPushServiceInstance.sendNotificationGroupStudy(
      id,
      WEBPUSH_MSG.GROUPSTUDY.PARTICIPATE(token.name, groupStudy.title),
    );

    await this.fcmServiceInstance.sendNotificationGroupStudy(
      id,
      WEBPUSH_MSG.GROUPSTUDY.PARTICIPATE(token.name, groupStudy.title),
    );

    return;
  }

  async inviteGroupStudy(id: string, userId: string) {
    const groupStudy = await this.groupStudyRepository.findById(id);
    const user = await this.userServiceInstance.getUserWithUserId(userId);
    if (!groupStudy) throw new Error();

    //ticket 차감 로직
    const ticketInfo = await this.userServiceInstance.getTicketInfo(user._id);
    if (ticketInfo.groupStudyTicket <= 0) throw new Error('no ticket');

    groupStudy.participateGroupStudy(user._id, 'member');

    await this.userServiceInstance.updateReduceTicket(
      'group',
      user._id,
      -groupStudy.requiredTicket,
    );
    await this.groupStudyRepository.save(groupStudy);

    return;
  }

  async deleteParticipate(id: string) {
    const token = RequestContext.getDecodedToken();
    const groupStudy = await this.groupStudyRepository.findById(id);

    if (!groupStudy) throw new Error();

    groupStudy.deleteParticipant(token.id);

    await this.groupStudyRepository.save(groupStudy);

    return;
  }

  async exileParticipate(id: string, toUid: string, randomId?: number) {
    const groupStudy = await this.groupStudyRepository.findById(id);

    if (!groupStudy) throw new Error();
    try {
      if (!randomId) {
        groupStudy.deleteParticipant(toUid);
      } else {
        groupStudy.deleteParticipantByRandomId(randomId);
      }
      await this.groupStudyRepository.save(groupStudy);
    } catch (err) {
      throw new Error();
    }
    return;
  }

  async getWaitingPerson(id: string) {
    const data = await this.groupStudyRepository.findByIdWithWaiting(id);

    return data;
  }

  async setWaitingPerson(id: string, pointType: string, answer?: string[]) {
    const token = RequestContext.getDecodedToken();

    const groupStudy = await this.groupStudyRepository.findById(id);
    if (!groupStudy) throw new Error();

    try {
      const user = {
        userId: token.id,
        answer,
        pointType,
        createdAt: DateUtils.getKoreaToday(),
      };

      groupStudy.setWaiting(user);

      await this.groupStudyRepository.save(groupStudy);

      await this.webPushServiceInstance.sendNotificationToXWithId(
        groupStudy.organizer,
        WEBPUSH_MSG.GROUPSTUDY.TITLE,
        WEBPUSH_MSG.GROUPSTUDY.REQUEST(token.name, groupStudy.title),
      );
      await this.fcmServiceInstance.sendNotificationToXWithId(
        groupStudy.organizer,
        WEBPUSH_MSG.GROUPSTUDY.TITLE,
        WEBPUSH_MSG.GROUPSTUDY.REQUEST(token.name, groupStudy.title),
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
      if (status === 'agree') {
        groupStudy.agreeWaiting(userId);

        //ticket 소모 로직
        const ticketInfo = await this.userServiceInstance.getTicketInfo(userId);
        if (ticketInfo.groupStudyTicket < groupStudy.requiredTicket) {
          throw new HttpException('no ticket', 500);
        }
        this.userServiceInstance.updateReduceTicket(
          'group',
          userId,
          -groupStudy.requiredTicket,
        );
        // if (groupStudy.meetingType !== 'online') {
        //   if (ticketInfo.groupStudyTicket <= 1)
        //     throw new HttpException('no ticket', 500);
        //   this.userServiceInstance.updateReduceTicket('groupOffline', userId);
        // } else {
        //   if (ticketInfo.groupStudyTicket <= 0)
        //     throw new HttpException('no ticket', 500);
        //   this.userServiceInstance.updateReduceTicket('groupOnline', userId);
        // }

        await this.webPushServiceInstance.sendNotificationToXWithId(
          userId,
          WEBPUSH_MSG.GROUPSTUDY.TITLE,
          WEBPUSH_MSG.GROUPSTUDY.AGREE(groupStudy.title),
        );
        await this.fcmServiceInstance.sendNotificationToXWithId(
          userId,
          WEBPUSH_MSG.GROUPSTUDY.TITLE,
          WEBPUSH_MSG.GROUPSTUDY.AGREE(groupStudy.title),
        );
      } else {
        groupStudy.disagreeWaiting(userId);
      }

      await this.groupStudyRepository.save(groupStudy);
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

    const firstDate = DateUtils.getLatestMonday();

    groupStudy.patchAttendance(
      firstDate,
      groupStudy.attendance.thisWeek,
      groupStudy.attendance.lastWeek,
    );

    await this.groupStudyRepository.save(groupStudy);
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
      groupStudy.attend(
        token.id,
        token.name,
        token.uid,
        weekRecord,
        type as any,
        weekRecordSub,
      );

      await this.groupStudyRepository.save(groupStudy);
      // if (type === 'this') groupStudy.attendance.firstDate = firstDate;

      // const weekData =
      //   type === 'this'
      //     ? groupStudy.attendance.thisWeek
      //     : groupStudy.attendance.lastWeek;

      // const findUser = weekData.find((who) => who.uid === token.uid + '');
      // const findMember = groupStudy.participants.find(
      //   (who) => who.user.toString() === (token.id as string),
      // );

      // if (findUser) {
      //   const beforeCnt = findUser.attendRecord.length;
      //   if (findMember) {
      //     findMember.attendCnt += -beforeCnt + weekRecord.length;
      //   }
      //   findUser.attendRecord = weekRecord;
      //   findUser.attendRecordSub = weekRecordSub;
      // } else {
      //   const data = {
      //     name: token.name as string,
      //     uid: token.uid as string,
      //     attendRecord: weekRecord,
      //     attendRecordSub: weekRecordSub,
      //   };
      //   if (findMember) {
      //     findMember.attendCnt += weekRecord.length;
      //   }
      //   if (type === 'this') {
      //     groupStudy.attendance.thisWeek.push(data);
      //   }
      //   if (type === 'last') groupStudy.attendance.lastWeek.push(data);
      // }

      // await groupStudy?.save();

      return;
    } catch (err) {
      throw new Error();
    }
  }

  async updateParticipantsRole(groupId, userId, role) {
    const groupStudy = await this.groupStudyRepository.findById(groupId);
    if (groupStudy) {
      groupStudy.updateRole(userId, role);
      await this.groupStudyRepository.save(groupStudy);
    }
    if (!groupStudy) throw new Error();
  }

  async createComment(groupStudyId: string, comment: string) {
    const token = RequestContext.getDecodedToken();

    const groupStudy = await this.groupStudyRepository.findById(groupStudyId);
    if (!groupStudy) throw new DatabaseError('wrong groupStudyId');

    try {
      const commentList =
        await this.commentService.findCommentsByPostId(groupStudyId);

      await this.commentService.createComment({
        postId: groupStudy._id.toString(),
        postType: 'groupStudy',
        user: token.id,
        comment: comment,
      });
    } catch (error) {
      console.error('리뷰 작성 중 오류 발생:', error);
      throw error;
    }

    await this.webPushServiceInstance.sendNotificationToXWithId(
      groupStudy.organizer,
      WEBPUSH_MSG.GROUPSTUDY.TITLE,
      WEBPUSH_MSG.GROUPSTUDY.COMMENT_CREATE(groupStudy.title),
    );
    await this.fcmServiceInstance.sendNotificationToXWithId(
      groupStudy.organizer,
      WEBPUSH_MSG.GROUPSTUDY.TITLE,
      WEBPUSH_MSG.GROUPSTUDY.COMMENT_CREATE(groupStudy.title),
    );
  }

  //comment방식 바꾸기
  async deleteComment(groupStudyId: string, commentId: string) {
    await this.commentService.deleteComment({ commentId: commentId });
  }

  async patchComment(groupStudyId: string, commentId: string, comment: string) {
    await this.commentService.updateComment({
      commentId: commentId,
      content: comment,
    });

    return;
  }

  async createCommentLike(groupStudyId: number, commentId: string) {
    const token = RequestContext.getDecodedToken();

    await this.commentService.likeComment(commentId, token.id);
  }

  async createSubCommentLike(
    groupStudyId: number,
    commentId: string,
    subCommentId: string,
  ) {
    const token = RequestContext.getDecodedToken();

    await this.commentService.likeComment(subCommentId, token.id);
    return;
  }

  async monthAttend(groupId, userId, last) {
    const groupStudy = await this.groupStudyRepository.findById(groupId);

    if (!groupStudy) throw new Error('해당 소모임을 찾을 수 없습니다.');

    const result = groupStudy.checkMonthAttendance(userId, last);

    // if (result) {
    //   await this.userServiceInstance.updateScoreWithUserId(
    //     userId,
    //     CONST.SCORE.GROUP_MONTHLY_PARTICIPATE,
    //     '소모임 월간 출석',
    //   );
    // }

    await this.groupStudyRepository.save(groupStudy);

    return;
  }

  async depositGroupStudy(id: number, deposit: number) {
    const token = RequestContext.getDecodedToken();

    const groupStudy = await this.groupStudyRepository.findById(id.toString());
    if (!groupStudy) throw new DatabaseError('wrong groupStudyId');

    if (deposit < 0) {
      throw new HttpException('금액은 0보다 작을 수 없습니다.', 400);
    }

    groupStudy.updateDeposit(token.id.toString(), deposit);

    await this.groupStudyRepository.save(groupStudy);

    return;
  }

  async processGroupStudyAttend() {
    const groupStudies = await this.groupStudyRepository.findAll();
    if (!groupStudies) throw new Error('No group studies found');

    try {
      for (const group of groupStudies) {
        group.processMonthAttendance();

        await this.groupStudyRepository.save(group);
      }

      for (const group of groupStudies) {
        if (group.status === 'end') continue;

        const promises = group.participants.map((par) =>
          this.userServiceInstance.updateReduceTicket(
            'group',
            par.user,
            group.requiredTicket,
          ),
        );

        await Promise.all(promises);

        // await this.userServiceInstance.updateTicketWithUserIds(
        //   group.participants.map((part) => part.user),
        //   group.requiredTicket,
        // );
      }
    } catch (err) {
      throw new AppError(
        err?.message ?? 'Failed to process group study attendance',
        500,
      );
    }
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

        await this.groupStudyRepository.save(group);
      });
      return { a, b, allUser };
    } catch (err) {
      throw new Error();
    }
  }

  // async weekAttend(groupId: string, userId: string) {
  //   const groupStudy = await this.groupStudyRepository.findBy_Id(groupId);

  //   const result = groupStudy.checkWeekAttendance(userId);

  //   if (result) {
  //     await this.userServiceInstance.updateScoreWithUserId(
  //       userId,
  //       CONST.SCORE.GROUP_WEEKLY_PARTICIPATE,
  //       '소모임 주간 출석',
  //     );
  //   }

  //   await this.groupStudyRepository.save(groupStudy);

  //   return;
  // }

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
    try {
      const feeds = await this.groupStudyRepository.findAllTemp();

      for (const feed of feeds) {
        const comments = feed.comments;

        for (const comment of comments) {
          if (!comment?.comment) continue;

          const saveComment = await this.commentService.createComment({
            postId: feed._id.toString(),
            postType: 'groupStudy',
            user: comment.user,
            comment: comment.comment,
            likeList: comment?.likeList || [],
          });

          const subComments = comment.subComments || [];

          for (const subComment of subComments) {
            if (!subComment.comment) continue;

            const saveSubComment = await this.commentService.createSubComment({
              postId: feed._id.toString(),
              postType: 'groupStudy',
              user: subComment.user,
              comment: subComment.comment,
              parentId: saveComment._id.toString(),
              likeList: subComment?.likeList || [],
            });
          }
        }
      }

      return feeds;
    } catch (err) {
      console.log(err);
    }
  }
}
