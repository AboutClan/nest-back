import {
  BadRequestException,
  HttpException,
  Inject,
  Injectable,
} from '@nestjs/common';
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
    const gatherData = await this.gatherRepository.findByIdPop(gatherId);
    return gatherData;
  }

  async getThreeGather() {
    const gatherData = await this.gatherRepository.findThree();

    return gatherData;
  }

  async getGather(cursor: number | null) {
    const gap = 12;
    let start = gap * (cursor || 0);

    let gatherData = await this.gatherRepository.findAll(start, gap);

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

    let gatherData = await this.gatherRepository.findMyStatusGather(
      token.id,
      'open',
      start,
      gap,
    );

    return gatherData;
  }

  async getMyFinishGather(cursor: number | null) {
    const token = RequestContext.getDecodedToken();

    const gap = 12;
    let start = gap * (cursor || 0);

    let gatherData = await this.gatherRepository.findMyStatusGather(
      token.id,
      'finish',
      start,
      gap,
    );

    return gatherData;
  }

  async getMyGather(cursor: number | null) {
    const token = RequestContext.getDecodedToken();

    const gap = 12;
    let start = gap * (cursor || 0);

    let gatherData = await this.gatherRepository.findMyGather(
      token.id,
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

  async participateGather(gatherId: number, phase: string, userId: string) {
    const token = RequestContext.getDecodedToken();
    const id = userId ?? token.id;

    const { ticket } = await this.userServiceInstance.getTicketInfo(id);

    if (ticket.gatherTicket <= 0) {
      throw new HttpException('ticket이 부족합니다.', 500);
    }

    //type 수정필요
    const gather = await this.gatherRepository.findById(gatherId.toString());
    if (!gather) throw new Error();

    try {
      const validatedParticipate = ParticipantsZodSchema.parse({
        user: id,
        phase,
      });
      await this.gatherRepository.participate(gatherId, validatedParticipate);
    } catch (err) {
      throw new BadRequestException('Invalid participate data');
    }

    await this.userServiceInstance.updateReduceTicket('gather', id);
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
        '누군가 모임에 참여했어요',
        '접속하여 확인하세요!',
      );

    return;
  }

  async deleteParticipate(gatherId: number) {
    const token = RequestContext.getDecodedToken();
    await this.gatherRepository.deleteParticipants(gatherId, token.id);

    await this.userServiceInstance.updateScore(
      CANCEL_GAHTER_SCORE,
      '번개 모임 참여 취소',
    );

    await this.userServiceInstance.updateAddTicket('gather', token.id);
    return;
  }

  async setStatus(gatherId: number, status: gatherStatus) {
    await this.gatherRepository.updateGather(gatherId, {
      status,
    });

    return;
  }
  async setWaitingPerson(id: string, phase: 'first' | 'second') {
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
          '누군가 모임에 가입했어요',
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
    try {
      let message = `모임 신청이 거절되었습니다. ${text}`;

      await this.gatherRepository.deleteWaiting(id, userId);

      if (status === 'agree') {
        const { ticket } = await this.userServiceInstance.getTicketInfo(userId);

        if (ticket.gatherTicket <= 0) {
          throw new AppError('ticket이 부족합니다.', 500);
        }

        const validatedParticipate = ParticipantsZodSchema.parse({
          user: userId,
          phase: 'first',
        });
        await this.gatherRepository.participate(
          parseInt(id),
          validatedParticipate,
        );
        await this.userServiceInstance.updateReduceTicket('gather', userId);
        message = '모임 신청이 승인되었습니다.';
      }

      // await this.chatServiceInstance.createChat(userId, message);
    } catch (err) {
      throw new Error();
    }
  }

  async createSubComment(gatherId: string, commentId: string, content: string) {
    const token = RequestContext.getDecodedToken();
    const message: subCommentType = {
      user: token.id,
      comment: content,
    };

    await this.gatherRepository.createSubComment(gatherId, commentId, message);

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
    await this.gatherRepository.createComment(gatherId, token.id, comment);

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
