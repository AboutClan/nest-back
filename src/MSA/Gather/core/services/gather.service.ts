import {
  BadRequestException,
  HttpException,
  Inject,
  Injectable,
} from '@nestjs/common';
import dayjs from 'dayjs';
import { CONST } from 'src/Constants/CONSTANTS';
import { WEBPUSH_MSG } from 'src/Constants/WEBPUSH_MSG';
import { Gather, GatherProps } from 'src/domain/entities/Gather/Gather';
import { ParticipantsProps } from 'src/domain/entities/Gather/Participants';
import { AppError } from 'src/errors/AppError';
import { DatabaseError } from 'src/errors/DatabaseError';
import { logger } from 'src/logger';
import { UserService } from 'src/MSA/User/core/services/user.service';
import { RequestContext } from 'src/request-context';
import { CounterService } from 'src/routes/counter/counter.service';
import ImageService from 'src/routes/imagez/image.service';
import { DateUtils } from 'src/utils/Date';
import { IGATHER_REPOSITORY } from 'src/utils/di.tokens';
import { FcmService } from '../../../Notification/core/services/fcm.service';
import { IUser } from '../../../User/entity/user.entity';
import {
  gatherStatus,
  IGatherData,
  ParticipantsZodSchema,
} from '../../entity/gather.entity';
import { IGatherRepository } from '../interfaces/GatherRepository.interface';
import GatherCommentService from './comment.service';

//commit
@Injectable()
export class GatherService {
  constructor(
    @Inject(IGATHER_REPOSITORY)
    private readonly gatherRepository: IGatherRepository,
    private readonly userServiceInstance: UserService,
    private readonly counterServiceInstance: CounterService,
    private readonly fcmServiceInstance: FcmService,
    private readonly imageServiceInstance: ImageService,
    private readonly commentService: GatherCommentService,
  ) {}
  async getEnthMembers() {
    return await this.gatherRepository.getEnthMembers();
  }

  async getGatherById(gatherId: number) {
    const gatherData = await this.gatherRepository.findById(gatherId, true);

    const comments = await this.commentService.findCommentsByPostId(
      gatherData._id.toString(),
    );

    return { ...gatherData, comments };
  }

  async getThreeGather() {
    const gatherData = await this.gatherRepository.findThree();

    return gatherData;
  }

  async getGather(
    cursor: number | null,
    category: '취미' | '스터디',
    sortBy: 'createdAt' | 'date' | 'basic',
  ) {
    const allowedCategories = [
      '소셜 게임',
      '감상',
      '운동',
      '푸드',
      '힐링',
      '친목',
      '파티',
      '기타',
    ];
    const query =
      category === '스터디'
        ? { 'type.title': { $nin: allowedCategories } }
        : category === '취미'
          ? { 'type.title': { $in: allowedCategories } }
          : {};

    if (sortBy === 'basic') {
      const todayMidnightKST = dayjs().startOf('day').toISOString();
      const futureQuery = { ...query, date: { $gte: todayMidnightKST } };

      if (cursor === 0) {
        const futureResult = await this.gatherRepository.findWithQueryPop(
          futureQuery,
          cursor,
          { date: 1 },
          true,
        );

        return futureResult;

        // const futureCount = futureResult.length;

        // if (futureCount === 15) return futureResult;

        // const pastQuery = { ...query, date: { $lt: todayMidnightKST } };
        // const pastResult = (
        //   await this.gatherRepository.findWithQueryPop(pastQuery, cursor, {
        //     date: -1,
        //   })
        // ).slice(0, 15 - futureCount);

        // return [...futureResult, ...pastResult];
      } else {
        const pastQuery = { ...query, date: { $lt: todayMidnightKST } };
        const pastResult = await this.gatherRepository.findWithQueryPop(
          pastQuery,
          cursor - 1,
          { date: -1 },
        );

        return [...pastResult];
      }
    } else {
      const sortOption: { [key: string]: any } = { [sortBy]: -1 };

      const gatherData = await this.gatherRepository.findWithQueryPop(
        query,
        cursor,
        sortOption,
      );

      return gatherData;
    }
  }

  async getGatherCount(userId: string) {
    const gatherData = await this.gatherRepository.findMyGather(userId, false);

    return gatherData?.length;
  }
  async getStatusGather(cursor: number, userId: string) {
    const token = RequestContext.getDecodedToken();

    const query = {
      $or: [
        { participants: { $elemMatch: { user: userId || token.id } } },
        { user: userId || token.id },
      ],
      ...(userId && { status: 'open' }),
    };
    const gatherData = await this.gatherRepository.findWithQueryPop(
      query,
      cursor,
      { date: -1 },
    );

    return gatherData;
  }

  async getMyOpenGather(cursor: number | null) {
    const token = RequestContext.getDecodedToken();

    const todayString = dayjs().startOf('day').toISOString();
    const query = {
      $and: [
        {
          $or: [
            { participants: { $elemMatch: { user: token.id } } },
            { user: token.id },
          ],
        },
        { date: { $gte: todayString } },
      ],
    };

    const gatherData = await this.gatherRepository.findWithQueryPop(
      query,
      cursor,
    );

    return gatherData;
  }

  async getMyFinishGather(cursor: number | null) {
    const token = RequestContext.getDecodedToken();

    const todayString = dayjs().startOf('day').toISOString();
    const query = {
      $and: [
        {
          $or: [
            { participants: { $elemMatch: { user: token.id } } },
            { user: token.id },
          ],
        },
        { date: { $lt: todayString } },
      ],
    };

    const gatherData = await this.gatherRepository.findWithQueryPop(
      query,
      cursor,
      { date: -1 },
    );

    if (cursor === -1) {
    }

    return gatherData;
  }

  async getMyGather(cursor: number | null) {
    const token = RequestContext.getDecodedToken();

    const query = {
      user: token.id,
    };
    const gatherData = await this.gatherRepository.findWithQueryPop(
      query,
      cursor,
    );

    return gatherData;
  }

  async getReviewGather(): Promise<Gather | null> {
    const token = RequestContext.getDecodedToken();
    const userIdString = token.id.toString();

    const myGathers = (
      await this.gatherRepository.findMyGather(token.id)
    ).filter(
      (g) =>
        dayjs(g.date).isBefore(dayjs()) &&
        dayjs(g.date).isAfter(dayjs().subtract(2, 'week')),
    );

    const notReviewed = myGathers.filter((g) => {
      const reviewerIds = g.reviewers.map((r) => r.toString());
      const isReviewed = reviewerIds.includes(userIdString);

      const isParticipant = g.participants.some(
        (p) => (p.user as any)._id.toString() === userIdString,
      );
      const isOwner = (g.user as any)._id.toString() === userIdString;

      return (
        dayjs(g.date).add(1, 'day').startOf('day').isBefore(dayjs()) &&
        !isReviewed &&
        (isParticipant || isOwner)
      );
    });

    return notReviewed[0] ?? null;
  }

  async getGatherGroup(groupId, type) {
    const gatherData = await this.gatherRepository.findByGroupId(groupId, type);

    if (!gatherData) {
      throw new HttpException('Gather not found', 404);
    }

    return gatherData;
  }

  //todo: 타입 수정 필요
  //place 프론트에서 데이터 전송으로 인해 생성 삭제
  async createGather(data: Partial<IGatherData>, buffer: any) {
    let imageUrl = '';
    if (buffer) {
      imageUrl = await this.imageServiceInstance.uploadSingleImage(
        'gather',
        buffer,
      );
    }
    const token = RequestContext.getDecodedToken();

    const nextId =
      await this.counterServiceInstance.getNextSequence('counterid');

    const gatherInfo = {
      ...data,
      user: token.id,
      id: nextId,
      coverImg: imageUrl,
    };

    const gatherData = new Gather(gatherInfo as GatherProps);

    const created = await this.gatherRepository.createGather(gatherData);

    if (!created) throw new DatabaseError('create gather failed');

    await this.userServiceInstance.updateScore(
      CONST.SCORE.CREATE_GATHER,
      '번개 모임 개설',
    );

    return gatherData.id;
  }

  async updateGather(gatherData: Partial<IGatherData>, buffer: any) {
    if (buffer) {
      const imageUrl = await this.imageServiceInstance.uploadSingleImage(
        'gather',
        buffer,
      );
      gatherData.coverImage = imageUrl;
    }

    await this.gatherRepository.updateGather(gatherData.id, gatherData);
    return;
  }

  async useDepositToParticipateGather(gather: Gather, userId: string) {
    gather.deposit += -CONST.POINT.PARTICIPATE_GATHER;

    try {
      await this.userServiceInstance.updatePointById(
        CONST.POINT.PARTICIPATE_GATHER,
        '번개 모임 보증금',
        '',
        userId,
      );
    } catch (err) {
      console.log(err);
      logger.error(err);
      throw new AppError(err, 500);
    }

    return;
  }

  async returnDepositToRemoveGather(gather: Gather) {
    const diffDay = this.getDaysDifferenceFromNowKST(gather.date);
    if (diffDay > -3) return;

    const participants = gather.participants;

    for (const participant of participants) {
      gather.deposit += CONST.POINT.PARTICIPATE_GATHER;

      if (gather.deposit < 0) {
        gather.deposit += -CONST.POINT.PARTICIPATE_GATHER;
        break;
      }

      await this.userServiceInstance.updatePointById(
        -CONST.POINT.PARTICIPATE_GATHER,
        '번개 모임 취소',
        '',
        participant.user.toString(),
      );
    }

    return;
  }

  //isFree는 초대코드 입력해서 온 경우
  async participateGather(gatherId: number, phase: string, isFree: boolean) {
    const token = RequestContext.getDecodedToken();
    const ticket = await this.userServiceInstance.getTicketInfo(token.id);

    if (ticket.gatherTicket <= 0 && !isFree) {
      throw new HttpException('ticket이 부족합니다.', 500);
    }

    //type 수정필요
    const gather = await this.gatherRepository.findById(gatherId);
    if (!gather) throw new Error();

    try {
      const partData = {
        user: token.id,
        phase,
        invited: !!isFree,
      };
      const validatedParticipate = ParticipantsZodSchema.parse(partData);

      gather.participate(validatedParticipate as ParticipantsProps);

      await this.gatherRepository.save(gather);
    } catch (err) {
      throw new BadRequestException('Invalid participate data');
    }

    if (!isFree) {
      await this.userServiceInstance.updateReduceTicket('gather', token.id, -1);
    }
    await this.userServiceInstance.updateScore(
      CONST.SCORE.PARTICIPATE_GATHER,
      '번개 모임 참여',
    );

    if (gather.user) {
      await this.fcmServiceInstance.sendNotificationToXWithId(
        gather?.user as string,
        WEBPUSH_MSG.GATHER.TITLE,
        WEBPUSH_MSG.GATHER.PARTICIPATE(
          token.name,
          DateUtils.formatGatherDate(gather.date),
        ),
        `/gather/${gather.id}`,
      );
    }

    return;
  }

  async inviteGather(gatherId: number, phase: string, userId: string) {
    //type 수정필요
    const gather = await this.gatherRepository.findById(gatherId);
    if (!gather) throw new Error();

    try {
      const partData = {
        user: userId,
        phase,
        invited: true,
      };
      const validatedParticipate = ParticipantsZodSchema.parse(partData);

      gather.participate(validatedParticipate as ParticipantsProps);

      await this.gatherRepository.save(gather);
    } catch (err) {
      throw new BadRequestException('Invalid participate data');
    }

    const user = await this.userServiceInstance.getUserWithUserId(userId);

    await this.userServiceInstance.updateScore(
      CONST.SCORE.PARTICIPATE_GATHER,
      '번개 모임 참여',
      undefined,
      user.uid,
    );

    if (userId) {
      await this.fcmServiceInstance.sendNotificationToXWithId(
        userId,
        WEBPUSH_MSG.GATHER.TITLE,
        WEBPUSH_MSG.GATHER.INVITE(DateUtils.formatGatherDate(gather.date)),
        `/gather/${gather.id}`,
      );
    }

    return;
  }

  async exileGather(gatherId: number, userId: string) {
    const gather = await this.gatherRepository.findById(gatherId);
    if (!gather) throw new Error();
    gather.exile(userId);
    await this.gatherRepository.save(gather);
  }

  getDaysDifferenceFromNowKST(isoDate: string): number {
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const KST_OFFSET_MS = 9 * 60 * 60 * 1000; // UTC+9

    // 입력값과 현재 시각을 UTC 타임스탬프로 가져오기
    const inputTs = new Date(isoDate).getTime();
    const nowTs = Date.now();

    /**
     * 타임스탬프(ts)를 받아서
     *   1) KST 시각으로 변환 (ts + 9시간)
     *   2) 그 값을 일 단위로 내림(floor)하여 ‘몇 번째 날짜’인지 구함
     *   3) 다시 KST 기준 자정의 UTC 타임스탬프로 되돌림
     */
    function startOfKSTDay(ts: number): number {
      const kstTs = ts + KST_OFFSET_MS;
      const dayIndex = Math.floor(kstTs / MS_PER_DAY);
      return dayIndex * MS_PER_DAY - KST_OFFSET_MS;
    }

    const inputDayStart = startOfKSTDay(inputTs);
    const todayDayStart = startOfKSTDay(nowTs);

    // 두 자정 타임스탬프 차이를 하루(ms)로 나누어 일수 계산
    return Math.floor((inputDayStart - todayDayStart) / MS_PER_DAY);
  }

  //userId가 있으면 관리자 행동. 없으면 참여자 스스로 행동.
  async deleteParticipate(gatherId: number, userId?: string) {
    const token = RequestContext.getDecodedToken();

    const gather = await this.gatherRepository.findById(gatherId);
    if (!gather) throw new Error();

    const targetId = userId ?? token.id;

    gather.exile(targetId);

    // 모임 이틀 전까지 = 포인트 100% + 티켓 반환
    // 모임 하루 전 = 포인트만 50% 반환
    // 모임 당일 = 반환 X
    try {
      const handlePointPenalty = async (day: 0 | 1, point: number) => {
        await this.userServiceInstance.updatePointById(
          point,
          `번개 모임 ${day === 1 ? '전날' : '당일'} 취소 패널티`,
          'gather',
          targetId,
        );
      };
      const diffDay = this.getDaysDifferenceFromNowKST(
        dayjs(gather.date).startOf('day').toISOString(),
      );

      if (diffDay >= 2) {
        const targetInfo = gather.participants.find(
          (data) => data.user.toString() == targetId.toString(),
        );
        if (!targetInfo?.invited) {
          await this.userServiceInstance.updateAddTicket(
            'gather',
            targetId,
            1,
            'return',
          );
        }
      } else if (diffDay === 1 && !userId) {
        //1000원 벌금
        await handlePointPenalty(1, CONST.POINT.PARTICIPATE_GATHER / 2);
      } else if (diffDay === 0 && !userId) {
        //2000원 벌금
        await handlePointPenalty(0, CONST.POINT.PARTICIPATE_GATHER);
      }
    } catch (err) {}

    await this.gatherRepository.save(gather);

    await this.userServiceInstance.updateScoreWithUserId(
      targetId,
      CONST.SCORE.CANCEL_GATHER,
      '번개 모임 참여 취소',
      'gather',
    );

    return;
  }

  async setStatus(gatherId: number, status: gatherStatus) {
    const gather = await this.gatherRepository.findById(gatherId);

    if (status === 'close') {
      await this.returnDepositToRemoveGather(gather);
    }

    gather.status = status;
    await this.gatherRepository.save(gather);

    return;
  }

  async setAbsence(userId: string, gatherId: number) {
    const gather = await this.gatherRepository.findById(gatherId);

    gather.setAbsence(userId);

    await this.gatherRepository.save(gather);
  }

  async distributeDeposit() {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const twoDayAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    const gathers = await this.gatherRepository.findByPeriod(
      twoDayAgo,
      oneDayAgo,
    );

    for (const gather of gathers) {
      if (gather.deposit <= 0) continue;

      let distributeDeposit = 0;
      const distributeList = [];

      gather.participants.forEach((participant) => {
        if (!participant.absence) {
          distributeList.push(participant.user.toString());

          distributeDeposit += -CONST.POINT.PARTICIPATE_GATHER;
          gather.deposit += CONST.POINT.PARTICIPATE_GATHER;

          if (gather.deposit < 0) {
            throw new AppError('보증금이 부족합니다.', 500);
          }
        }
      });

      for (const userId of distributeList) {
        await this.userServiceInstance.updatePointById(
          distributeDeposit / distributeList.length,
          '번개 모임 보증금 반환',
          '',
          userId,
        );
      }

      if (gather.deposit !== 0) {
        await this.userServiceInstance.updatePointById(
          (gather.deposit * 5) / 10,
          '번개 모임 보증금 반환',
          '',
          gather.user.toString(),
        );

        gather.deposit = 0;
      }

      await this.gatherRepository.save(gather);
    }
  }

  async gatherPanelty() {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const twoDayAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    const gathers = await this.gatherRepository.findByPeriod(
      twoDayAgo,
      oneDayAgo,
    );

    for (const gather of gathers) {
      for (const participant of gather.participants) {
        if (participant.absence) {
          await this.userServiceInstance.updatePointById(
            CONST.POINT.PARTICIPATE_GATHER,
            '번개 모임 노쇼 패널티',
            '',
            participant.user.toString(),
          );
        }
      }
    }
  }

  async setWaitingPerson(id: number, phase: 'first' | 'second') {
    const token = RequestContext.getDecodedToken();

    const gather = await this.gatherRepository.findById(id);
    if (!gather) throw new Error();

    try {
      const user = {
        user: token.id,
        phase,
        createdAt: DateUtils.getKoreaToday(),
      };

      gather.setWaiting(user);

      await this.gatherRepository.save(gather);

      if (gather.user) {
        await this.fcmServiceInstance.sendNotificationToXWithId(
          gather?.user as string,
          WEBPUSH_MSG.GATHER.TITLE,
          WEBPUSH_MSG.GATHER.REQUEST(
            token.name,
            DateUtils.formatGatherDate(gather.date),
          ),
          `/gather/${gather.id}`,
        );
      }
    } catch (err) {
      throw new Error();
    }
  }

  //가입신청 승인 or 거절
  async handleWaitingPerson(
    id: string,
    userId: string,
    status: string,
    text?: string,
  ) {
    const token = RequestContext.getDecodedToken();

    const gather = await this.gatherRepository.findById(+id);

    gather.removeWaiting(userId);

    if (status === 'agree') {
      const ticket = await this.userServiceInstance.getTicketInfo(userId);

      if (ticket.gatherTicket <= 0) {
        throw new AppError(`${token.uid} ticket이 부족합니다.`, 500);
      }

      const validatedParticipate = ParticipantsZodSchema.parse({
        user: userId,
        phase: 'first',
      });

      gather.participate(validatedParticipate as ParticipantsProps);

      const targetUser =
        await this.userServiceInstance.getUserWithUserId(userId);

      await this.userServiceInstance.updateScore(
        CONST.SCORE.PARTICIPATE_GATHER,
        '번개 모임 참여',
        undefined,
        targetUser.uid,
      );
      await this.userServiceInstance.updateReduceTicket('gather', userId, -1);
    }

    await this.gatherRepository.save(gather);

    if (status === 'agree') {
      await this.fcmServiceInstance.sendNotificationToXWithId(
        userId,
        WEBPUSH_MSG.GATHER.TITLE,
        WEBPUSH_MSG.GATHER.ACCEPT(
          DateUtils.formatGatherDate(gather.date),
          !!gather?.kakaoUrl,
        ),
        `/gather/${gather.id}`,
      );
    } else {
      await this.fcmServiceInstance.sendNotificationToXWithId(
        userId,
        WEBPUSH_MSG.GATHER.TITLE,
        WEBPUSH_MSG.GATHER.REFUSE(DateUtils.formatGatherDate(gather.date)),
        `/gather/${gather.id}`,
      );
    }
  }

  async createSubComment(gatherId: string, commentId: string, content: string) {
    const token = RequestContext.getDecodedToken();

    const gather = await this.gatherRepository.findById(+gatherId, true);

    const commentWriter = await this.commentService.createSubComment({
      postId: gather._id.toString(),
      user: token.id,
      comment: content,
      parentId: commentId,
    });

    if (commentWriter) {
      await this.fcmServiceInstance.sendNotificationToXWithId(
        commentWriter as string,
        WEBPUSH_MSG.GATHER.TITLE,
        WEBPUSH_MSG.GATHER.COMMENT_CREATE(
          token.name,
          DateUtils.formatGatherDate(gather.date),
        ),
        `/gather/${gather.id}`,
      );
      // 모임장 알림

      await this.fcmServiceInstance.sendNotificationToXWithId(
        (gather.user as unknown as IUser)._id.toString(),
        WEBPUSH_MSG.GATHER.COMMENT_CREATE(
          token.name,
          DateUtils.formatGatherDate(gather.date),
        ),
        '',
        `/gather/${gather.id}`,
      );
    }

    return;
  }

  async deleteSubComment(
    gatherId: string,
    commentId: string,
    subCommentId: string,
  ) {
    await this.commentService.deleteComment({ commentId: subCommentId });
    return;
  }

  async updateSubComment(
    gatherId: string,
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

  //수정필요
  async createComment(gatherId: string, comment: string) {
    const token = RequestContext.getDecodedToken();

    const gather = await this.gatherRepository.findById(+gatherId, true);
    await this.commentService.createComment({
      postId: gather._id.toString(),
      user: token.id,
      comment: comment,
    });

    await this.fcmServiceInstance.sendNotificationToXWithId(
      (gather.user as unknown as IUser)._id.toString(),
      WEBPUSH_MSG.GATHER.TITLE,
      WEBPUSH_MSG.GATHER.COMMENT_CREATE(
        token.name,
        DateUtils.formatGatherDate(gather.date),
      ),
      `/gather/${gather.id}`,
    );

    return;
  }

  async deleteComment(gatherId: string, commentId: string) {
    await this.commentService.deleteComment({ commentId: commentId });

    return;
  }

  async patchComment(gatherId: string, commentId: string, comment: string) {
    await this.commentService.updateComment({
      commentId: commentId,
      content: comment,
    });

    return;
  }

  async createCommentLike(gatherId: number, commentId: string) {
    const token = RequestContext.getDecodedToken();

    await this.commentService.likeComment(commentId, token.id);
  }

  async createSubCommentLike(
    gatherId: string,
    commentId: string,
    subCommentId: string,
  ) {
    const token = RequestContext.getDecodedToken();

    await this.commentService.likeComment(subCommentId, token.id);
  }

  async deleteGather(gatherId: string) {
    const gather = await this.gatherRepository.findById(+gatherId, true);
    await this.returnDepositToRemoveGather(gather);
    await this.distributeTicket(gather);

    const deleted = await this.gatherRepository.deleteById(+gatherId);
    if (!deleted?.deletedCount) throw new DatabaseError('delete failed');

    await this.userServiceInstance.updateScore(
      CONST.SCORE.REMOVE_GATHER,
      '번개 모임 개설 취소',
    );
    return;
  }

  async distributeTicket(gather: Gather) {
    const today = DateUtils.getTodayYYYYMMDD();

    if (gather.date < today) return;

    for (const participant of gather.participants) {
      if (!participant.invited) {
        await this.userServiceInstance.updateAddTicket(
          'gather',
          participant.user,
          1,
          'return',
        );
      }
    }
  }

  async test() {
    try {
      const feeds = await this.gatherRepository.findAllTemp();

      for (const feed of feeds) {
        const comments = feed.comments;

        for (const comment of comments) {
          if (!comment?.comment) continue;

          const saveComment = await this.commentService.createComment({
            postId: feed._id.toString(),
            user: comment.user,
            comment: comment.comment,
          });

          const subComments = comment.subComments || [];

          for (const subComment of subComments) {
            if (!subComment.comment) continue;

            await this.commentService.createSubComment({
              postId: feed._id.toString(),
              user: subComment.user,
              comment: subComment.comment,
              parentId: saveComment._id.toString(),
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
