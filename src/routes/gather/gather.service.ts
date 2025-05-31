import {
  BadRequestException,
  HttpException,
  Inject,
  Injectable,
} from '@nestjs/common';
import dayjs from 'dayjs';
import { CONST } from 'src/Constants/CONSTANTS';
import { WEBPUSH_MSG } from 'src/Constants/WEBPUSH_MSG';
import { CounterService } from 'src/counter/counter.service';
import { Gather, GatherProps } from 'src/domain/entities/Gather/Gather';
import { ParticipantsProps } from 'src/domain/entities/Gather/Participants';
import { SubCommentProps } from 'src/domain/entities/Gather/SubComment';
import { AppError } from 'src/errors/AppError';
import { DatabaseError } from 'src/errors/DatabaseError';
import { RequestContext } from 'src/request-context';
import { UserService } from 'src/routes/user/user.service';
import { WebPushService } from 'src/routes/webpush/webpush.service';
import { IGATHER_REPOSITORY } from 'src/utils/di.tokens';
import {
  gatherStatus,
  IGatherData,
  ParticipantsZodSchema,
  subCommentType,
} from './gather.entity';
import { IGatherRepository } from './GatherRepository.interface';
import { logger } from 'src/logger';
import { DateUtils } from 'src/utils/Date';
import { FcmService } from '../fcm/fcm.service';
import { IUser } from '../user/user.entity';

//commit
@Injectable()
export class GatherService {
  constructor(
    @Inject(IGATHER_REPOSITORY)
    private readonly gatherRepository: IGatherRepository,
    private readonly userServiceInstance: UserService,
    private readonly counterServiceInstance: CounterService,
    private readonly webPushServiceInstance: WebPushService,
    private readonly fcmServiceInstance: FcmService,
  ) {}
  async getEnthMembers() {
    return await this.gatherRepository.getEnthMembers();
  }

  async getGatherById(gatherId: number) {
    const gatherData = await this.gatherRepository.findById(gatherId, true);

    return gatherData;
  }

  async getThreeGather() {
    const gatherData = await this.gatherRepository.findThree();

    return gatherData;
  }

  async getGather(
    cursor: number | null,
    category: '취미' | '스터디',
    sortBy: 'createdAt' | 'date',
  ) {
    const gap = 20;
    let start = gap * (cursor || 0);
    const query =
      category === '스터디'
        ? { 'type.title': '스터디' }
        : category === '취미'
          ? { 'type.title': { $ne: '스터디' } }
          : {};

    let gatherData = await this.gatherRepository.findWithQueryPop(
      query,
      start,
      gap,
      sortBy,
    );

    return gatherData;
  }

  async getStatusGather(status: string, cursor: number) {
    switch (status) {
      case 'isParticipating':
        return this.getMyOpenGather(cursor);
      case 'isEnded':
        return this.getMyFinishGather(cursor);
      case 'isOwner':
        return this.getMyGather(cursor);
      default:
        break;
    }
  }

  async getMyOpenGather(cursor: number | null) {
    const token = RequestContext.getDecodedToken();

    const gap = 12;
    let start = gap * (cursor || 0);

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

    let gatherData = await this.gatherRepository.findWithQueryPop(
      query,
      start,
      gap,
    );

    return gatherData;
  }

  async getMyFinishGather(cursor: number | null) {
    const token = RequestContext.getDecodedToken();
    const gap = 12;
    let start = gap * (cursor || 0);

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

    let gatherData = await this.gatherRepository.findWithQueryPop(
      query,
      start,
      gap,
    );

    if (cursor === -1) {
    }

    return gatherData;
  }

  async getMyGather(cursor: number | null) {
    const token = RequestContext.getDecodedToken();

    const gap = 12;
    let start = gap * (cursor || 0);

    const query = {
      user: token.id,
    };
    let gatherData = await this.gatherRepository.findWithQueryPop(
      query,
      start,
      gap,
    );

    return gatherData;
  }

  async getReviewGather(): Promise<Gather | null> {
    const token = RequestContext.getDecodedToken();
    const userIdString = token.id.toString();

    const myGathers = (await this.gatherRepository.findMyGather(token.id))
      .filter(
        (g) =>
          dayjs(g.date).isBefore(dayjs()) &&
          dayjs(g.date).isAfter(dayjs().subtract(2, 'week')),
      )
      .slice(0, 2);

    const notReviewed = myGathers.filter((g) => {
      const reviewerIds = g.reviewers.map((r) => r.toString());
      const isReviewed = reviewerIds.includes(userIdString);

      const isParticipant = g.participants.some(
        (p) => (p.user as any)._id.toString() === userIdString,
      );
      const isOwner = (g.user as any)._id.toString() === userIdString;

      return (
        dayjs(g.date).isBefore(dayjs()) &&
        !isReviewed &&
        (isParticipant || isOwner)
      );
    });

    return notReviewed[0] ?? null;
  }

  //todo: 타입 수정 필요
  //place 프론트에서 데이터 전송으로 인해 생성 삭제
  async createGather(data: Partial<IGatherData>) {
    const token = RequestContext.getDecodedToken();

    const nextId =
      await this.counterServiceInstance.getNextSequence('counterid');

    const gatherInfo = {
      ...data,
      user: token.id,
      id: nextId,
    };

    const gatherData = new Gather(gatherInfo as GatherProps);

    // const gatherData = gatherInfo;
    const created = await this.gatherRepository.createGather(gatherData);

    if (!created) throw new DatabaseError('create gather failed');

    await this.userServiceInstance.updateScore(
      CONST.SCORE.CREATE_GATHER,
      '번개 모임 개설',
    );

    return gatherData.id;
  }

  async updateGather(gatherData: Partial<IGatherData>) {
    await this.gatherRepository.updateGather(gatherData.id, gatherData);
    return;
  }

  async useDepositToParticipateGather(gather: Gather, userId: string) {
    gather.deposit += -CONST.POINT.PARTICIPATE_GATHER;

    try {
      const user = await this.userServiceInstance.getUserWithUserId(userId);

      await this.userServiceInstance.updatePointById(
        CONST.POINT.PARTICIPATE_GATHER,
        '번개 모임 참여',
        '',
        userId,
      );
    } catch (err) {
      logger.error(err);
      throw new AppError(err, 500);
    }

    return;
  }

  async returnDepositToRemoveGather(gather: Gather) {
    const participants = gather.participants;

    for (const participant of participants) {
      gather.deposit += CONST.POINT.PARTICIPATE_GATHER;

      if (gather.deposit < 0) {
        gather.deposit += -CONST.POINT.PARTICIPATE_GATHER;
        throw new AppError('보증금이 부족합니다.', 500);
      }

      await this.userServiceInstance.updatePointById(
        -CONST.POINT.PARTICIPATE_GATHER,
        '번개 모임 취소',
        '',
        participant.user,
      );
    }

    return;
  }

  async participateGather(gatherId: number, phase: string, isFree: boolean) {
    const token = RequestContext.getDecodedToken();
    const { ticket } = await this.userServiceInstance.getTicketInfo(token.id);

    if (ticket.gatherTicket <= 0 && !isFree) {
      throw new HttpException('ticket이 부족합니다.', 500);
    }

    //type 수정필요
    const gather = await this.gatherRepository.findById(gatherId);
    if (!gather) throw new Error();

    try {
      let partData = {
        user: token.id,
        phase,
        invited: !!isFree,
      };
      const validatedParticipate = ParticipantsZodSchema.parse(partData);

      gather.participate(validatedParticipate as ParticipantsProps);

      await this.useDepositToParticipateGather(gather, token.id);

      await this.gatherRepository.save(gather);
    } catch (err) {
      throw new BadRequestException('Invalid participate data');
    }

    if (!isFree) {
      await this.userServiceInstance.updateReduceTicket('gather', token.id);
    }
    await this.userServiceInstance.updateScore(
      CONST.SCORE.PARTICIPATE_GATHER,
      '번개 모임 참여',
    );

    if (gather.user) {
      await this.webPushServiceInstance.sendNotificationToXWithId(
        gather?.user as string,
        WEBPUSH_MSG.GATHER.TITLE,
        WEBPUSH_MSG.GATHER.PARTICIPATE(
          token.name,
          DateUtils.formatGatherDate(gather.date),
        ),
      );
      await this.fcmServiceInstance.sendNotificationToXWithId(
        gather?.user as string,
        WEBPUSH_MSG.GATHER.TITLE,
        WEBPUSH_MSG.GATHER.PARTICIPATE(
          token.name,
          DateUtils.formatGatherDate(gather.date),
        ),
      );
    }

    return;
  }

  async inviteGather(gatherId: number, phase: string, userId: string) {
    //type 수정필요
    const gather = await this.gatherRepository.findById(gatherId);
    if (!gather) throw new Error();

    try {
      let partData = {
        user: userId,
        phase,
        invited: true,
      };
      const validatedParticipate = ParticipantsZodSchema.parse(partData);

      gather.participate(validatedParticipate as ParticipantsProps);

      await this.useDepositToParticipateGather(gather, userId);

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
      await this.webPushServiceInstance.sendNotificationToXWithId(
        userId,
        WEBPUSH_MSG.GATHER.TITLE,
        WEBPUSH_MSG.GATHER.INVITE(DateUtils.formatGatherDate(gather.date)),
      );

      await this.fcmServiceInstance.sendNotificationToXWithId(
        userId,
        WEBPUSH_MSG.GATHER.TITLE,
        WEBPUSH_MSG.GATHER.INVITE(DateUtils.formatGatherDate(gather.date)),
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

  async deleteParticipate(gatherId: number) {
    const token = RequestContext.getDecodedToken();

    const gather = await this.gatherRepository.findById(gatherId);
    if (!gather) throw new Error();
    gather.exile(token.id);

    try {
      const diffDay = this.getDaysDifferenceFromNowKST(gather.date);
      if (diffDay > 2) {
        await this.userServiceInstance.updatePoint(
          -CONST.POINT.PARTICIPATE_GATHER,
          '번개 모임 참여 취소',
        );
        gather.deposit += CONST.POINT.PARTICIPATE_GATHER;
      } else if (diffDay === 1) {
        await this.userServiceInstance.updatePoint(
          -CONST.POINT.PARTICIPATE_GATHER / 2,
          '번개 모임 참여 취소',
        );
        gather.deposit += CONST.POINT.PARTICIPATE_GATHER / 2;
      }
    } catch (err) {}
    await this.gatherRepository.save(gather);

    await this.userServiceInstance.updateScore(
      CONST.SCORE.CANCEL_GAHTER,
      '번개 모임 참여 취소',
    );

    const myData = gather.participants.filter((data) => data.user == token.id);
    if (!myData[0]?.invited)
      await this.userServiceInstance.updateAddTicket('gather', token.id);
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

    for (let gather of gathers) {
      if (gather.deposit <= 0) continue;

      let distributeDeposit = 0;
      const distributeList = [];

      gather.participants.forEach((participant) => {
        if (!participant.absence) {
          distributeList.push(participant.user);

          distributeDeposit += -CONST.POINT.PARTICIPATE_GATHER;
          gather.deposit += CONST.POINT.PARTICIPATE_GATHER;

          if (gather.deposit < 0) {
            throw new AppError('보증금이 부족합니다.', 500);
          }
        }
      });

      for (let userId of distributeList) {
        await this.userServiceInstance.updatePointById(
          distributeDeposit / distributeList.length,
          '번개 모임 보증금 반환',
          '',
          userId,
        );
      }

      if (gather.deposit !== 0) {
        await this.userServiceInstance.updatePointById(
          (gather.deposit * 8) / 10,
          '번개 모임 보증금 반환',
          '',
          gather.user,
        );

        gather.deposit = 0;
      }

      await this.gatherRepository.save(gather);
    }
  }

  async setWaitingPerson(id: number, phase: 'first' | 'second') {
    const token = RequestContext.getDecodedToken();

    const gather = await this.gatherRepository.findById(id);
    if (!gather) throw new Error();

    try {
      const user = { user: token.id, phase };

      gather.setWaiting(user);

      await this.gatherRepository.save(gather);

      if (gather.user) {
        await this.webPushServiceInstance.sendNotificationToXWithId(
          gather?.user as string,
          WEBPUSH_MSG.GATHER.TITLE,
          WEBPUSH_MSG.GATHER.REQUEST(
            token.name,
            DateUtils.formatGatherDate(gather.date),
          ),
        );
        await this.fcmServiceInstance.sendNotificationToXWithId(
          gather?.user as string,
          WEBPUSH_MSG.GATHER.TITLE,
          WEBPUSH_MSG.GATHER.REQUEST(
            token.name,
            DateUtils.formatGatherDate(gather.date),
          ),
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
      const { ticket } = await this.userServiceInstance.getTicketInfo(userId);

      if (ticket.gatherTicket <= 0) {
        throw new AppError(`${token.uid} ticket이 부족합니다.`, 500);
      }

      const validatedParticipate = ParticipantsZodSchema.parse({
        user: userId,
        phase: 'first',
      });

      gather.participate(validatedParticipate as ParticipantsProps);

      await this.useDepositToParticipateGather(gather, userId);

      const targetUser =
        await this.userServiceInstance.getUserWithUserId(userId);

      await this.userServiceInstance.updateScore(
        CONST.SCORE.PARTICIPATE_GATHER,
        '번개 모임 참여',
        undefined,
        targetUser.uid,
      );

      await this.userServiceInstance.updateReduceTicket('gather', userId);
    }

    await this.gatherRepository.save(gather);

    await this.webPushServiceInstance.sendNotificationToXWithId(
      userId,
      WEBPUSH_MSG.GATHER.TITLE,
      WEBPUSH_MSG.GATHER.ACCEPT(DateUtils.formatGatherDate(gather.date)),
    );
    await this.fcmServiceInstance.sendNotificationToXWithId(
      userId,
      WEBPUSH_MSG.GATHER.TITLE,
      WEBPUSH_MSG.GATHER.ACCEPT(DateUtils.formatGatherDate(gather.date)),
    );
  }

  async createSubComment(gatherId: string, commentId: string, content: string) {
    const token = RequestContext.getDecodedToken();
    const message: subCommentType = {
      user: token.id,
      comment: content,
    };

    const gather = await this.gatherRepository.findById(+gatherId, true);
    if (!gather) throw new Error('gather not found');

    gather.addSubComment(commentId, message as SubCommentProps);
    await this.gatherRepository.save(gather);

    const comment = gather.comments.filter(
      (comment) => comment._id == commentId,
    );

    if (comment[0] && comment[0].user) {
      await this.webPushServiceInstance.sendNotificationToXWithId(
        comment[0].user as string,
        WEBPUSH_MSG.GATHER.TITLE,
        WEBPUSH_MSG.GATHER.COMMENT_CREATE(
          token.name,
          DateUtils.formatGatherDate(gather.date),
        ),
      );
      await this.fcmServiceInstance.sendNotificationToXWithId(
        comment[0].user as string,
        WEBPUSH_MSG.GATHER.TITLE,
        WEBPUSH_MSG.GATHER.COMMENT_CREATE(
          token.name,
          DateUtils.formatGatherDate(gather.date),
        ),
      );
      // 모임장 알림
      await this.webPushServiceInstance.sendNotificationToXWithId(
        (gather.user as unknown as IUser)._id.toString(),
        WEBPUSH_MSG.GATHER.COMMENT_CREATE(
          token.name,
          DateUtils.formatGatherDate(gather.date),
        ),
      );
      await this.fcmServiceInstance.sendNotificationToXWithId(
        (gather.user as unknown as IUser)._id.toString(),
        WEBPUSH_MSG.GATHER.COMMENT_CREATE(
          token.name,
          DateUtils.formatGatherDate(gather.date),
        ),
        '',
      );
    }

    return;
  }

  async deleteSubComment(
    gatherId: string,
    commentId: string,
    subCommentId: string,
  ) {
    const gather = await this.gatherRepository.findById(+gatherId, true);
    if (!gatherId) throw new Error('gather not found');

    gather.removeSubComment(commentId, subCommentId);
    return;
  }

  async updateSubComment(
    gatherId: string,
    commentId: string,
    subCommentId: string,
    comment: string,
  ) {
    const gather = await this.gatherRepository.findById(+gatherId, true);
    if (!gatherId) throw new Error('gather not found');

    gather.updateSubComment(commentId, subCommentId, comment);
    await this.gatherRepository.save(gather);

    return;
  }

  //수정필요
  async createComment(gatherId: string, comment: string) {
    const token = RequestContext.getDecodedToken();
    const gather = await this.gatherRepository.findById(+gatherId, true);
    if (!gather) throw new Error('gather not found');

    gather.addComment({
      user: token.id,
      comment,
    } as SubCommentProps);

    await this.gatherRepository.save(gather);

    await this.webPushServiceInstance.sendNotificationToXWithId(
      (gather.user as unknown as IUser)._id.toString(),
      WEBPUSH_MSG.GATHER.TITLE,
      WEBPUSH_MSG.GATHER.COMMENT_CREATE(
        token.name,
        DateUtils.formatGatherDate(gather.date),
      ),
    );
    await this.fcmServiceInstance.sendNotificationToXWithId(
      (gather.user as unknown as IUser)._id.toString(),
      WEBPUSH_MSG.GATHER.TITLE,
      WEBPUSH_MSG.GATHER.COMMENT_CREATE(
        token.name,
        DateUtils.formatGatherDate(gather.date),
      ),
    );

    return;
  }

  //수정필요
  async deleteComment(gatherId: string, commentId: string) {
    const gather = await this.gatherRepository.findById(+gatherId, true);
    if (!gather) throw new Error('gather not found');

    gather.removeComment(commentId);
    await this.gatherRepository.save(gather);

    return;
  }

  //수정필요
  async patchComment(gatherId: string, commentId: string, comment: string) {
    const gather = await this.gatherRepository.findById(+gatherId, true);
    if (!gather) throw new Error('gather not found');

    gather.updateComment(commentId, comment);
    await this.gatherRepository.save(gather);
    return;
  }

  async createCommentLike(gatherId: number, commentId: string) {
    const token = RequestContext.getDecodedToken();

    const gather = await this.gatherRepository.findById(gatherId, true);
    if (!gather) throw new Error('gather not found');

    gather.addCommentLike(commentId, token.id);
    await this.gatherRepository.save(gather);
  }

  async createSubCommentLike(
    gatherId: string,
    commentId: string,
    subCommentId: string,
  ) {
    const token = RequestContext.getDecodedToken();

    const gather = await this.gatherRepository.findById(+gatherId, true);
    if (!gather) throw new Error('gather not found');

    gather.addSubCommentLike(commentId, subCommentId, token.id);
    await this.gatherRepository.save(gather);

    if (!gather) {
      throw new DatabaseError('cant find gather');
    }
  }

  async deleteGather(gatherId: string) {
    const gather = await this.gatherRepository.findById(+gatherId, true);
    await this.returnDepositToRemoveGather(gather);

    const deleted = await this.gatherRepository.deleteById(gatherId);
    if (!deleted.deletedCount) throw new DatabaseError('delete failed');

    await this.userServiceInstance.updateScore(
      CONST.SCORE.REMOVE_GAHTER,
      '번개 모임 삭제',
    );
    return;
  }
}
