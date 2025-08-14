import { Inject } from '@nestjs/common';
import { WEBPUSH_MSG } from 'src/Constants/WEBPUSH_MSG';
import ImageService from 'src/routes/imagez/image.service';
import { RequestContext } from 'src/request-context';
import { ISQUARE_REPOSITORY } from 'src/utils/di.tokens';
import { FcmService } from '../fcm/fcm.service';
import { WebPushService } from '../webpush/webpush.service';
import { Square } from 'src/domain/entities/Square/Square';
import { SquareComment } from 'src/domain/entities/Square/SquareComment';
import { SquareSubComment } from 'src/domain/entities/Square/SquareSubComment';
import { SquarePoll } from 'src/domain/entities/Square/SquarePoll';
import { ISquareRepository } from './square.repository.interface';
import CommentService from '../comment/comment.service';

export default class SquareService {
  constructor(
    @Inject(ISQUARE_REPOSITORY)
    private readonly squareRepository: ISquareRepository,
    private readonly imageServiceInstance: ImageService,
    private readonly webPushServiceInstance: WebPushService,
    private readonly fcmServiceInstance: FcmService,
    private readonly commentService: CommentService,
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
      const squares = await this.squareRepository.findByCategory(
        category,
        start,
        gap,
      );
      return squares.slice(start, start + gap);
    }
  }

  async createSquare(square: Partial<Square> & { buffers: Buffer[] }) {
    const token = RequestContext.getDecodedToken();

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

    const square = await this.squareRepository.findById(squareId);

    if (!square) {
      throw new Error(`Square with id ${squareId} not found`);
    }

    await this.commentService.createComment({
      postId: squareId,
      postType: 'square',
      user: token.id,
      comment,
    });

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
    await this.commentService.deleteComment({ commentId });
  }

  async createSubComment(squareId: string, commentId: string, content: string) {
    const token = RequestContext.getDecodedToken();

    const square = await this.squareRepository.findById(squareId);
    await this.commentService.createSubComment({
      postId: squareId,
      postType: 'square',
      parentId: commentId,
      user: token.id,
      comment: content,
    });

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
    await this.commentService.deleteComment({
      commentId: subCommentId,
    });
  }

  async updateSubComment(
    squareId: string,
    commentId: string,
    subCommentId: string,
    comment: string,
  ) {
    await this.commentService.updateComment({
      commentId: subCommentId,
      content: comment,
    });
  }

  async createCommentLike(squareId: string, commentId: string) {
    const token = RequestContext.getDecodedToken();

    await this.commentService.likeComment(commentId, token.id);
  }

  async createSubCommentLike(
    squareId: string,
    commentId: string,
    subCommentId: string,
  ) {
    const token = RequestContext.getDecodedToken();

    await this.commentService.likeComment(subCommentId, token.id);
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

  async test() {
    try {
      const feeds = await this.squareRepository.findAllTemp();

      for (const feed of feeds) {
        const comments = feed.comments;

        for (const comment of comments) {
          if (!comment?.comment) continue;

          const saveComment = await this.commentService.createComment({
            postId: feed._id.toString(),
            postType: 'square',
            user: comment.user,
            comment: comment.comment,
          });

          const subComments = comment.subComments || [];

          for (const subComment of subComments) {
            if (!subComment.comment) continue;

            const saveSubComment = await this.commentService.createSubComment({
              postId: feed._id.toString(),
              postType: 'square',
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
