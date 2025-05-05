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
import { formatGatherDate } from 'src/utils/dateUtils';
import { IGATHER_REPOSITORY } from 'src/utils/di.tokens';
import {
  gatherStatus,
  IGatherData,
  ParticipantsZodSchema,
  subCommentType,
} from './gather.entity';
import { IGatherRepository } from './GatherRepository.interface';

//commit
@Injectable()
export class GatherService {
  constructor(
    @Inject(IGATHER_REPOSITORY)
    private readonly gatherRepository: IGatherRepository,
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
    console.log(cursor);
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
          formatGatherDate(gather.date),
        ),
      );
    }

    return;
  }

  async inviteGather(gatherId: number, phase: string, userId: string) {
    //userId존재 => 초대로 들어온 경우임
    const token = RequestContext.getDecodedToken();

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

    if (userId)
      await this.webPushServiceInstance.sendNotificationToXWithId(
        userId,
        WEBPUSH_MSG.GATHER.TITLE,
        WEBPUSH_MSG.GATHER.INVITE(formatGatherDate(gather.date)),
      );

    return;
  }

  async exileGather(gatherId: number, userId: string) {
    const gather = await this.gatherRepository.findById(gatherId);
    if (!gather) throw new Error();
    gather.exile(userId);
    await this.gatherRepository.save(gather);
  }

  async deleteParticipate(gatherId: number) {
    const token = RequestContext.getDecodedToken();

    const gather = await this.gatherRepository.findById(gatherId);
    if (!gather) throw new Error();
    gather.exile(token.id);
    await this.gatherRepository.save(gather);

    await this.userServiceInstance.updateScore(
      CONST.SCORE.CANCEL_GAHTER,
      '번개 모임 참여 취소',
    );

    const myData = gather.participants.filter((data) => data.user == token.id);
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

      gather.setWaiting(user);

      await this.gatherRepository.save(gather);

      if (gather.user)
        await this.webPushServiceInstance.sendNotificationToXWithId(
          gather?.user as string,
          WEBPUSH_MSG.GATHER.TITLE,
          WEBPUSH_MSG.GATHER.REQUEST(token.name, formatGatherDate(gather.date)),
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
      WEBPUSH_MSG.GATHER.ACCEPT(formatGatherDate(gather.date)),
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
      (comment) => comment.id == commentId,
    );

    if (comment[0] && comment[0].user) {
      await this.webPushServiceInstance.sendNotificationToXWithId(
        comment[0].user as string,
        WEBPUSH_MSG.GATHER.TITLE,
        WEBPUSH_MSG.GATHER.COMMENT_CREATE(
          token.name,
          formatGatherDate(gather.date),
        ),
      );
      // 모임장 알림
      await this.webPushServiceInstance.sendNotificationToXWithId(
        gather.user as string,
        WEBPUSH_MSG.GATHER.COMMENT_CREATE(
          token.name,
          formatGatherDate(gather.date),
        ),
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
      gather.user as string,
      WEBPUSH_MSG.GATHER.TITLE,
      WEBPUSH_MSG.GATHER.COMMENT_CREATE(
        token.name,
        formatGatherDate(gather.date),
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
    const deleted = await this.gatherRepository.deleteById(gatherId);
    if (!deleted.deletedCount) throw new DatabaseError('delete failed');

    await this.userServiceInstance.updateScore(
      CONST.SCORE.REMOVE_GAHTER,
      '번개 모임 삭제',
    );
    return;
  }
}
