import {
  BadRequestException,
  HttpException,
  Inject,
  Injectable,
} from '@nestjs/common';
import dayjs from 'dayjs';
import { PARTICIPATE_GATHER_POINT } from 'src/Constants/point';
import {
  CANCEL_GAHTER_SCORE,
  CREATE_GATHER_SCORE,
  PARTICIPATE_GATHER_SCORE,
  REMOVE_GAHTER_SCORE,
} from 'src/Constants/score';
import { CounterService } from 'src/counter/counter.service';
import { AppError } from 'src/errors/AppError';
import { DatabaseError } from 'src/errors/DatabaseError';
import { RequestContext } from 'src/request-context';
import { UserService } from 'src/user/user.service';
import { IGATHER_REPOSITORY } from 'src/utils/di.tokens';
import { WebPushService } from 'src/webpush/webpush.service';
import {
  gatherStatus,
  IGatherData,
  ParticipantsZodSchema,
  subCommentType,
} from './gather.entity';
import { GatherRepository } from './gather.repository.interface';
//commit
@Injectable()
export class GatherService {
  constructor(
    @Inject(IGATHER_REPOSITORY)
    private readonly gatherRepository: GatherRepository,
    private readonly userServiceInstance: UserService,
    private readonly counterServiceInstance: CounterService,
    private readonly webPushServiceInstance: WebPushService,
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
    const gap = 12;
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
        ,
      ],
    };

    let gatherData = await this.gatherRepository.findWithQueryPop(
      query,
      start,
      gap,
    );

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

    const gatherData = gatherInfo;
    const created = await this.gatherRepository.createGather(gatherData);

    if (!created) throw new DatabaseError('create gather failed');

    await this.userServiceInstance.updateScore(
      CREATE_GATHER_SCORE,
      '번개 모임 개설',
    );

    return;
  }

  async updateGather(gather: IGatherData) {
    const updated = await this.gatherRepository.updateGather(gather.id, gather);
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
      await this.gatherRepository.participate(gatherId, validatedParticipate);
    } catch (err) {
      throw new BadRequestException('Invalid participate data');
    }

    if (!isFree) {
      await this.userServiceInstance.updateReduceTicket('gather', token.id);
    }
    await this.userServiceInstance.updateScore(
      PARTICIPATE_GATHER_SCORE,
      '번개 모임 참여',
    );
    await this.userServiceInstance.updatePoint(
      PARTICIPATE_GATHER_POINT,
      '번개 모임 참여',
    );

    if (gather.user)
      await this.webPushServiceInstance.sendNotificationToXWithId(
        gather?.user as string,
        `${token.name}님이 번개 모임에 합류했어요!`,
        '접속하여 확인하세요!',
      );

    return;
  }

  async inviteGather(gatherId: number, phase: string, userId: string) {
    //userId존재 => 초대로 들어온 경우임
    const token = RequestContext.getDecodedToken();
    const { ticket } = await this.userServiceInstance.getTicketInfo(userId);

    if (ticket.gatherTicket <= 0) {
      throw new HttpException('ticket이 부족합니다.', 500);
    }

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
      await this.gatherRepository.participate(gatherId, validatedParticipate);
    } catch (err) {
      throw new BadRequestException('Invalid participate data');
    }

    const user = await this.userServiceInstance.getUserWithUserId(userId);

    await this.userServiceInstance.updateScore(
      PARTICIPATE_GATHER_SCORE,
      '번개 모임 참여',
      undefined,
      user.uid,
    );
    await this.userServiceInstance.updatePoint(
      PARTICIPATE_GATHER_POINT,
      '번개 모임 참여',
      undefined,
      user.uid,
    );

    if (gather.user)
      await this.webPushServiceInstance.sendNotificationToXWithId(
        gather?.user as string,
        `${user.name}님이 번개 모임에 합류했어요!`,
        '접속하여 확인하세요!',
      );

    return;
  }

  async exileGather(gatherId: number, userId: string) {
    await this.gatherRepository.exileUser(gatherId, userId);
  }

  async deleteParticipate(gatherId: number) {
    const token = RequestContext.getDecodedToken();
    const oldData = await this.gatherRepository.deleteParticipants(
      gatherId,
      token.id,
    );

    await this.userServiceInstance.updateScore(
      CANCEL_GAHTER_SCORE,
      '번개 모임 참여 취소',
    );

    const myData = oldData.participants.filter((data) => data.user == token.id);
    if (!myData[0].invited)
      await this.userServiceInstance.updateAddTicket('gather', token.id);
    return;
  }

  async setStatus(gatherId: number, status: gatherStatus) {
    await this.gatherRepository.updateGather(gatherId, {
      status,
    });

    return;
  }
  async setWaitingPerson(id: number, phase: 'first' | 'second') {
    const token = RequestContext.getDecodedToken();

    const gather = await this.gatherRepository.findById(id);
    if (!gather) throw new Error();

    try {
      const user = { user: token.id, phase };
      if (gather?.waiting) {
        if (gather.waiting.includes(user)) {
          return;
        }
        gather.waiting.push(user);
      } else {
        gather.waiting = [user];
      }
      await gather?.save();

      if (gather.user)
        await this.webPushServiceInstance.sendNotificationToXWithId(
          gather?.user as string,
          `${token.name}님이 번개 모임 참여 신청을 했어요.`,
          '접속하여 확인하세요!',
        );
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
    let message = `모임 신청이 거절되었습니다. ${text}`;
    const token = RequestContext.getDecodedToken();

    await this.gatherRepository.deleteWaiting(id, userId);

    if (status === 'agree') {
      const { ticket } = await this.userServiceInstance.getTicketInfo(userId);

      if (ticket.gatherTicket <= 0) {
        throw new AppError(`${token.uid} ticket이 부족합니다.`, 500);
      }

      const validatedParticipate = ParticipantsZodSchema.parse({
        user: userId,
        phase: 'first',
      });

      await this.gatherRepository.participate(
        parseInt(id),
        validatedParticipate,
      );

      const targetUser =
        await this.userServiceInstance.getUserWithUserId(userId);
      await this.userServiceInstance.updateScore(
        PARTICIPATE_GATHER_SCORE,
        '번개 모임 참여',
        undefined,
        targetUser.uid,
      );

      await this.userServiceInstance.updateReduceTicket('gather', userId);
      message = '번개 모임 참여가 승인됐어요! 일정 확인하고 함께해요.';
    }

    await this.webPushServiceInstance.sendNotificationToXWithId(
      token.id,
      message,
      '접속하여 확인하세요!',
    );
    // await this.chatServiceInstance.createChat(userId, message);
  }

  async createSubComment(gatherId: string, commentId: string, content: string) {
    const token = RequestContext.getDecodedToken();
    const message: subCommentType = {
      user: token.id,
      comment: content,
    };

    const gather = await this.gatherRepository.createSubComment(
      gatherId,
      commentId,
      message,
    );

    const comment = gather.comments.filter(
      (comment) => comment._id == commentId,
    );

    if (comment[0] && comment[0].user) {
      await this.webPushServiceInstance.sendNotificationToXWithId(
        comment[0].user as string,
        `${token.name} 님이 내 댓글에 답글을 남겼어요.`,
        '접속하여 확인하세요!',
      );
    }

    return;
  }

  async deleteSubComment(
    gatherId: string,
    commentId: string,
    subCommentId: string,
  ) {
    await this.gatherRepository.deleteSubComment(
      gatherId,
      commentId,
      subCommentId,
    );
    return;
  }

  async updateSubComment(
    gatherId: string,
    commentId: string,
    subCommentId: string,
    comment: string,
  ) {
    await this.gatherRepository.updateSubComment(
      gatherId,
      commentId,
      subCommentId,
      comment,
    );

    return;
  }

  //수정필요
  async createComment(gatherId: string, comment: string) {
    const token = RequestContext.getDecodedToken();
    const gather = await this.gatherRepository.createComment(
      gatherId,
      token.id,
      comment,
    );

    console.log(gatherId, comment);
    await this.webPushServiceInstance.sendNotificationToXWithId(
      gather.user as string,
      `${gather.title} 에 새로운 댓글이 달렸어요!`,
      '접속하여 확인하세요!',
    );

    return;
  }

  //수정필요
  async deleteComment(gatherId: string, commentId: string) {
    await this.gatherRepository.deleteComment(gatherId, commentId);

    return;
  }

  //수정필요
  async patchComment(gatherId: string, commentId: string, comment: string) {
    await this.gatherRepository.updateComment(gatherId, commentId, comment);
    return;
  }

  async createCommentLike(gatherId: number, commentId: string) {
    const token = RequestContext.getDecodedToken();

    const gather = await this.gatherRepository.createCommentLike(
      gatherId,
      commentId,
      token.id,
    );

    if (!gather) {
      throw new DatabaseError('cant find gather');
    }
  }

  async createSubCommentLike(
    gatherId: string,
    commentId: string,
    subCommentId: string,
  ) {
    const token = RequestContext.getDecodedToken();

    const gather = await this.gatherRepository.createSubCommentLike(
      gatherId,
      commentId,
      subCommentId,
      token.id,
    );

    if (!gather) {
      throw new DatabaseError('cant find gather');
    }
  }

  async deleteGather(gatherId: string) {
    const deleted = await this.gatherRepository.deleteById(gatherId);
    if (!deleted.deletedCount) throw new DatabaseError('delete failed');

    await this.userServiceInstance.updateScore(
      REMOVE_GAHTER_SCORE,
      '번개 모임 삭제',
    );
    return;
  }
}
