import { Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { type Types } from 'mongoose';
import { type JWT } from 'next-auth/jwt/types';
import ImageService from 'src/imagez/image.service';
import { ISQUARE_REPOSITORY } from 'src/utils/di.tokens';
import {
  SecretSquareCategory,
  SecretSquareItem,
  SecretSquareZodSchema,
  subCommentType,
} from './square.entity';
import { SquareRepository } from './square.repository.interface';
import { RequestContext } from 'src/request-context';
import { WebPushService } from '../webpush/webpush.service';
import { WEBPUSH_MSG } from 'src/Constants/WEBPUSH_MSG';

export default class SquareService {
  constructor(
    @Inject(ISQUARE_REPOSITORY)
    private readonly squareRepository: SquareRepository,
    private readonly imageServiceInstance: ImageService,
    private readonly webPushServiceInstance: WebPushService,
  ) {}

  async getSquareList({
    category,
    cursorNum,
  }: {
    category: SecretSquareCategory | 'all';
    cursorNum: number | null;
  }) {
    const gap = 12;
    let start = gap * (cursorNum || 0);

    return await this.squareRepository.findSquareByCategory(
      category,
      start,
      gap,
    );
  }

  async createSquare(
    square: Partial<SecretSquareItem> & { buffers: Buffer[] },
  ) {
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

    const validatedSquare =
      squareType === 'poll'
        ? SecretSquareZodSchema.parse({
            category,
            title,
            content,
            author,
            type: squareType,
            poll,
            images,
          })
        : SecretSquareZodSchema.parse({
            category,
            title,
            content,
            author,
            type: squareType,
            images,
          });

    const { _id: squareId } =
      await this.squareRepository.create(validatedSquare);
    return { squareId };
  }

  async deleteSquare(squareId: string) {
    await this.squareRepository.findByIdAndDelete(squareId);
  }

  async getSquare(squareId: string) {
    const token = RequestContext.getDecodedToken();
    await this.squareRepository.findByIdAndUpdate(squareId, token.id);

    const secretSquare = await this.squareRepository.findById(squareId);

    // TODO 404 NOT FOUND
    if (!secretSquare) {
      throw new Error('not found');
    }

    return secretSquare;
  }

  async createSquareComment({
    comment,
    squareId,
  }: {
    comment: string;
    squareId: string;
  }) {
    const token = RequestContext.getDecodedToken();
    const updated = await this.squareRepository.updateComment(
      squareId,
      token.id,
      comment,
    );

    await this.webPushServiceInstance.sendNotificationToXWithId(
      updated.author.toString(),
      WEBPUSH_MSG.SQUARE.TITLE,
      WEBPUSH_MSG.SQUARE.COMMENT_CREATE(token.name),
    );
  }

  async deleteSquareComment({
    squareId,
    commentId,
  }: {
    squareId: string;
    commentId: string;
  }) {
    await this.squareRepository.deleteComment(squareId, commentId);
  }

  async createSubComment(squareId: string, commentId: string, content: string) {
    const token = RequestContext.getDecodedToken();
    try {
      const message: subCommentType = {
        user: token.id,
        comment: content,
      };
      const updated = await this.squareRepository.createSubComment(
        squareId,
        commentId,
        message,
      );

      //댓글 알림
      updated.comments.forEach((comment) => {
        if (comment._id.toString() === commentId.toString()) {
          this.webPushServiceInstance.sendNotificationToXWithId(
            comment.user.toString(),
            WEBPUSH_MSG.SQUARE.TITLE,
            WEBPUSH_MSG.SQUARE.COMMENT_CREATE(token.name),
          );
        }
      });

      await this.webPushServiceInstance.sendNotificationToXWithId(
        updated.author.toString(),
        WEBPUSH_MSG.SQUARE.TITLE,
        WEBPUSH_MSG.SQUARE.COMMENT_CREATE(token.name),
      );

      return;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  async deleteSubComment(
    squareId: string,
    commentId: string,
    subCommentId: string,
  ) {
    try {
      await this.squareRepository.deleteSubComment(
        squareId,
        commentId,
        subCommentId,
      );
    } catch (err: any) {
      throw new Error(err);
    }
  }

  async updateSubComment(
    squareId: string,
    commentId: string,
    subCommentId: string,
    comment: string,
  ) {
    try {
      await this.squareRepository.updateSubComment(
        squareId,
        commentId,
        subCommentId,
        comment,
      );
      return;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  async createCommentLike(squareId: string, commentId: string) {
    const token = RequestContext.getDecodedToken();

    try {
      const feed = await this.squareRepository.createCommentLike(
        squareId,
        commentId,
        token.id,
      );

      if (!feed) {
        throw new Error('해당 feedId 또는 commentId를 찾을 수 없습니다.');
      }
    } catch (err: any) {
      throw new Error(err);
    }
  }

  async createSubCommentLike(
    squareId: string,
    commentId: string,
    subCommentId: string,
  ) {
    const token = RequestContext.getDecodedToken();
    try {
      const square = await this.squareRepository.createSubCommentLike(
        squareId,
        commentId,
        subCommentId,
        token.id,
      );

      if (!square) {
        throw new Error('해당 feedId 또는 commentId를 찾을 수 없습니다.');
      }
    } catch (err: any) {
      throw new Error(err);
    }
  }
  async patchPoll({
    squareId,
    pollItems,
  }: {
    squareId: string;
    pollItems: string[];
  }) {
    const token = RequestContext.getDecodedToken();

    const secretSquare = await this.squareRepository.findById(squareId);

    // TODO 404 NOT FOUND
    if (!secretSquare) {
      throw new Error('not found');
    }

    // HACK Is it correct to write type assertion? Another solution?
    const user = token.id as unknown as Types.ObjectId;

    secretSquare.poll.pollItems.forEach((pollItem) => {
      const index = pollItem.users.indexOf(user);
      if (index > -1) {
        pollItem.users.splice(index, 1);
      }
    });

    if (pollItems.length !== 0) {
      pollItems.forEach((pollItemId) => {
        const index = secretSquare.poll.pollItems.findIndex((pollItem) =>
          pollItem._id.equals(pollItemId),
        );
        if (index > -1) {
          secretSquare.poll.pollItems[index].users.push(user);
        }
      });
    }

    await secretSquare.save();
  }

  async getCurrentPollItems({ squareId }: { squareId: string }) {
    const token = RequestContext.getDecodedToken();
    const secretSquare = await this.squareRepository.findById(squareId);

    // TODO 404 NOT FOUND
    if (!secretSquare) {
      throw new Error('not found');
    }

    if (secretSquare.type === 'general') {
      throw new Error('The type of this square is general');
    }

    // TODO remove type assertion
    const user = token.id as unknown as Types.ObjectId;
    const pollItems: string[] = [];

    secretSquare.poll.pollItems.forEach((pollItem) => {
      if (!pollItem.users.includes(user)) return;
      pollItems.push(pollItem._id.toString());
    });

    return pollItems;
  }

  //todo: 수정가능
  async putLikeSquare({ squareId }: { squareId: string }) {
    const token = RequestContext.getDecodedToken();
    const secretSquare = await this.squareRepository.updateLike(
      squareId,
      token.id,
    );

    return;
  }

  async deleteLikeSquare({ squareId }: { squareId: string }) {
    const token = RequestContext.getDecodedToken();
    await this.squareRepository.deleteLikeSquare(squareId, token.id);
    return;
  }

  //todo: 수정가능
  async getIsLike({ squareId }: { squareId: string }) {
    const token = RequestContext.getDecodedToken();

    const secretSquare = await this.squareRepository.findById(squareId);

    if (!secretSquare) {
      throw new Error('not found');
    }

    // TODO remove type assertion
    const user = token.id as unknown as Types.ObjectId;
    const isLike = secretSquare.like.includes(user);

    return isLike;
  }
}
