import { Inject } from '@nestjs/common';
import { WEBPUSH_MSG } from 'src/Constants/WEBPUSH_MSG';
import ImageService from 'src/imagez/image.service';
import { RequestContext } from 'src/request-context';
import { ISQUARE_REPOSITORY } from 'src/utils/di.tokens';
import { FcmService } from '../fcm/fcm.service';
import { WebPushService } from '../webpush/webpush.service';
import { Square } from 'src/domain/entities/Square/Square';
import { SquareComment } from 'src/domain/entities/Square/SquareComment';
import { SquareSubComment } from 'src/domain/entities/Square/SquareSubComment';
import { SquarePoll } from 'src/domain/entities/Square/SquarePoll';
import { ISquareRepository } from './square.repository.interface';

export default class SquareService {
  constructor(
    @Inject(ISQUARE_REPOSITORY)
    private readonly squareRepository: ISquareRepository,
    private readonly imageServiceInstance: ImageService,
    private readonly webPushServiceInstance: WebPushService,
    private readonly fcmServiceInstance: FcmService,
  ) {}

  async getSquareList({
    category,
    cursorNum,
  }: {
    category: string | 'all';
    cursorNum: number | null;
  }) {
    const gap = 12;
    let start = gap * (cursorNum || 0);

    if (category === 'all') {
      const result = await this.squareRepository.findWithPagination(
        Math.floor(start / gap) + 1,
        gap,
      );
      return result.squares;
    } else {
      const squares = await this.squareRepository.findByCategory(category);
      return squares.slice(start, start + gap);
    }
  }

  async createSquare(square: Partial<Square> & { buffers: Buffer[] }) {
    const token = RequestContext.getDecodedToken();
    console.log(42, square);
    const {
      category,
      title,
      content,
      type: squareType,
      poll,
      buffers,
    } = square;

    let images: string[] = [];
    if (buffers.length !== 0) {
      images = await this.imageServiceInstance.uploadImgCom(
        'secret-square',
        buffers,
      );
    }

    const author = token.id;

    const squareEntity = new Square({
      category,
      title,
      content,
      type: squareType,
      poll: new SquarePoll(poll),
      images,
      author,
      viewers: [],
      like: [],
      comments: [],
    });

    const createdSquare = await this.squareRepository.create(squareEntity);
    return { squareId: createdSquare._id };
  }

  async deleteSquare(squareId: string) {
    await this.squareRepository.delete(squareId);
  }

  async getSquare(squareId: string) {
    const token = RequestContext.getDecodedToken();
    await this.squareRepository.addViewer(squareId, token.id);

    const secretSquare = await this.squareRepository.findById(squareId);
    if (!secretSquare) {
      throw new Error(`Square with id ${squareId} not found`);
    }

    console.log(secretSquare.toPrimitives().poll);
    return secretSquare.toPrimitives();
  }

  async createSquareComment({
    comment,
    squareId,
  }: {
    comment: string;
    squareId: string;
  }) {
    const token = RequestContext.getDecodedToken();

    const squareComment = new SquareComment({
      user: token.id,
      comment,
      subComments: [],
      likeList: [],
    });

    const square = await this.squareRepository.findById(squareId);

    if (!square) {
      throw new Error(`Square with id ${squareId} not found`);
    }

    square.addComment(squareComment);
    await this.squareRepository.save(square);

    // 웹푸시 알림 발송
    if (square && square.author !== token.id) {
      await this.webPushServiceInstance.sendNotificationToXWithId(
        square.author,
        WEBPUSH_MSG.SQUARE.TITLE,
        WEBPUSH_MSG.SQUARE.COMMENT_CREATE(token.name),
      );
      await this.fcmServiceInstance.sendNotificationToXWithId(
        square.author,
        WEBPUSH_MSG.SQUARE.TITLE,
        WEBPUSH_MSG.SQUARE.COMMENT_CREATE(token.name),
      );
    }
  }

  async deleteSquareComment({
    squareId,
    commentId,
  }: {
    squareId: string;
    commentId: string;
  }) {
    const square = await this.squareRepository.findById(squareId);
    if (!square) {
      throw new Error(`Square with id ${squareId} not found`);
    }
    square.removeComment(commentId);
    await this.squareRepository.save(square);
  }

  async createSubComment(squareId: string, commentId: string, content: string) {
    const token = RequestContext.getDecodedToken();

    const subComment = new SquareSubComment({
      user: token.id,
      comment: content,
      likeList: [],
    });

    const square = await this.squareRepository.findById(squareId);
    square.addSubComment(commentId, subComment);
    await this.squareRepository.save(square);

    // 웹푸시 알림 발송
    if (square && square.author !== token.id) {
      await this.webPushServiceInstance.sendNotificationToXWithId(
        square.author,
        WEBPUSH_MSG.SQUARE.TITLE,
        WEBPUSH_MSG.SQUARE.COMMENT_CREATE(token.name),
      );
      await this.fcmServiceInstance.sendNotificationToXWithId(
        square.author,
        WEBPUSH_MSG.SQUARE.TITLE,
        WEBPUSH_MSG.SQUARE.COMMENT_CREATE(token.name),
      );
    }
  }

  async deleteSubComment(
    squareId: string,
    commentId: string,
    subCommentId: string,
  ) {
    const square = await this.squareRepository.findById(squareId);
    if (!square) {
      throw new Error(`Square with id ${squareId} not found`);
    }
    square.removeSubComment(commentId, subCommentId);
    await this.squareRepository.save(square);
  }

  async updateSubComment(
    squareId: string,
    commentId: string,
    subCommentId: string,
    comment: string,
  ) {
    const square = await this.squareRepository.findById(squareId);
    if (!square) {
      throw new Error(`Square with id ${squareId} not found`);
    }

    square.updateSubComment(commentId, subCommentId, comment);

    await this.squareRepository.save(square);
  }

  async createCommentLike(squareId: string, commentId: string) {
    const token = RequestContext.getDecodedToken();
    const square = await this.squareRepository.findById(squareId);

    square.addCommentLike(commentId, token.id);

    await this.squareRepository.update(squareId, square);
  }

  async createSubCommentLike(
    squareId: string,
    commentId: string,
    subCommentId: string,
  ) {
    const token = RequestContext.getDecodedToken();
    const square = await this.squareRepository.findById(squareId);

    if (!square) {
      throw new Error(`Square with id ${squareId} not found`);
    }
    square.addSubCommentLike(commentId, subCommentId, token.id);

    await this.squareRepository.save(square);
  }

  async patchPoll({
    squareId,
    pollItems,
  }: {
    squareId: string;
    pollItems: string[];
  }) {
    const token = RequestContext.getDecodedToken();
    const square = await this.squareRepository.findById(squareId);

    if (!square) {
      throw new Error(`Square with poll not found`);
    }

    square.patchPoll(token.id, pollItems);

    await this.squareRepository.update(squareId, square);
  }

  async getCurrentPollItems({ squareId }: { squareId: string }) {
    const square = await this.squareRepository.findById(squareId);
    if (!square || !square.poll) {
      throw new Error(`Square with poll not found`);
    }

    const token = RequestContext.getDecodedToken();

    const pollItems: string[] = [];

    square.poll.pollItems.forEach((pollItem) => {
      if (!pollItem.users.includes(token.id)) return;
      pollItems.push(pollItem._id.toString());
    });

    return pollItems;
  }

  async putLikeSquare({ squareId }: { squareId: string }) {
    const token = RequestContext.getDecodedToken();
    const square = await this.squareRepository.findById(squareId);
    if (!square) {
      throw new Error(`Square with id ${squareId} not found`);
    }
    square.addLike(token.id);
    await this.squareRepository.save(square);
  }

  async deleteLikeSquare({ squareId }: { squareId: string }) {
    const token = RequestContext.getDecodedToken();
    const square = await this.squareRepository.findById(squareId);
    if (!square) {
      throw new Error(`Square with id ${squareId} not found`);
    }
    square.removeLike(token.id);
    await this.squareRepository.save(square);
  }

  async getIsLike({ squareId }: { squareId: string }) {
    const token = RequestContext.getDecodedToken();
    const square = await this.squareRepository.findById(squareId);

    if (!square) {
      throw new Error(`Square with id ${squareId} not found`);
    }

    return square.like.includes(token.id);
  }

  // async test() {
  //   await this.squareRepository.test();
  // }
}
