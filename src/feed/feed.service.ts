import { Inject, Injectable } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { InjectModel } from '@nestjs/mongoose';
import { Request } from 'express';
import { Model, Types } from 'mongoose';
import { JWT } from 'next-auth/jwt';
import { DatabaseError } from 'src/errors/DatabaseError';
import { ValidationError } from 'src/errors/ValidationError';
import ImageService from 'src/imagez/image.service';
import { IUser } from 'src/user/entity/user.entity';
import { IFEED_REPOSITORY } from 'src/utils/di.tokens';
import {
  commentType,
  FeedZodSchema,
  subCommentType,
} from './entity/feed.entity';
import { FeedRepository } from './feed.repository.interface';
import { IFeedService } from './feedService.interface';

@Injectable()
export class FeedService implements IFeedService {
  private token: JWT;
  private imageServiceInstance: ImageService;

  constructor(
    @Inject(IFEED_REPOSITORY)
    private readonly feedRepository: FeedRepository,
    @InjectModel('User') private User: Model<IUser>,
    @Inject(REQUEST) private readonly request: Request, // Request 객체 주입
  ) {
    this.token = this.request.decodedToken;
    this.imageServiceInstance = new ImageService();
  }

  async findFeedByType(
    type?: string,
    typeId?: string,
    cursor?: number | null,
    isRecent?: boolean,
  ) {
    const gap = 12;
    let start = gap * (cursor || 0);

    const query: any = { type };
    if (typeId && typeId.trim() !== '') {
      query.typeId = typeId;
    }

    const feeds = await this.feedRepository.findWithQuery(
      query,
      start,
      gap,
      isRecent,
    );

    if (isRecent === false) {
      feeds.sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));
    }

    return feeds?.map((feed) => {
      const myLike = (feed?.like as IUser[])?.find(
        (who) => who.uid === this.token.uid,
      );
      let modifiedLike;
      if (myLike) {
        modifiedLike = [
          myLike,
          ...(feed.like as IUser[])
            .filter((who) => who.uid !== myLike.uid)
            .slice(0, 7),
        ];
      } else {
        modifiedLike = feed.like.slice(0, 8);
      }
      return {
        ...feed.toObject(),
        like: modifiedLike,
        likeCnt: feed?.like?.length,
      };
    });
  }

  async findFeedById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new ValidationError('invalid mongoDB Id type');
    }

    const feed = await this.findFeedById(id);

    const myLike = (feed?.like as IUser[])?.find(
      (who) => who.uid === this.token.uid,
    );
    let modifiedLike;
    if (myLike) {
      modifiedLike = [
        myLike,
        ...(feed?.like as IUser[])
          .filter((who) => who.uid !== myLike.uid)
          .slice(0, 7),
      ];
    } else {
      modifiedLike = feed?.like.slice(0, 8);
    }
    return {
      ...feed?.toObject(),
      like: modifiedLike,
      likeCnt: feed?.like?.length,
    };
  }

  async findFeedLikeById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new ValidationError('invalid mongoDB Id type');
    }
    const feed = await this.feedRepository.findByIdLike(id);

    return feed?.like as IUser[];
  }

  async findAllFeeds(cursor: number | null, isRecent?: boolean) {
    const gap = 12;
    let start = gap * (cursor || 0);

    const feeds = await this.feedRepository.findAll(start, gap, isRecent);

    return feeds?.map((feed) => {
      const myLike = (feed?.like as IUser[])?.find(
        (who) => who.uid === this.token.uid,
      );
      let modifiedLike;
      if (myLike) {
        modifiedLike = [
          myLike,
          ...(feed.like as IUser[])
            .filter((who) => who.uid !== myLike.uid)
            .slice(0, 7),
        ];
      } else {
        modifiedLike = feed.like.slice(0, 8);
      }
      return {
        ...feed.toObject(),
        like: modifiedLike,
        likeCnt: feed?.like?.length,
      };
    });
  }

  async createFeed({
    title,
    text,
    type,
    buffers,
    typeId,
    isAnonymous,
    subCategory,
  }: any) {
    const images = await this.imageServiceInstance.uploadImgCom(
      'feed',
      buffers,
    );
    const validatedFeed = FeedZodSchema.parse({
      title,
      text,
      writer: this.token.id,
      type,
      typeId,
      images,
      isAnonymous: Boolean(isAnonymous),
      subCategory,
    });

    await this.feedRepository.createFeed(validatedFeed);
    return;
  }
  async createComment(feedId: string, content: string) {
    const message: commentType = {
      user: this.token.id,
      comment: content,
    };

    //transaction
    const feed = await this.feedRepository.createComment(feedId, message);

    if (!feed) throw new DatabaseError('reate comment failed');

    const user = await this.User.findOneAndUpdate(
      { uid: this.token.uid },
      { $inc: { point: 2 } },
      { new: true, useFindAndModify: false },
    );
    if (!user) throw new DatabaseError('update score failed');

    return;
  }

  async deleteComment(feedId: string, commentId: string) {
    const feed = await this.feedRepository.deleteComment(feedId, commentId);

    if (!feed) throw new DatabaseError('delete comment failed');

    return;
  }

  async updateComment(feedId: string, commentId: string, comment: string) {
    const result = await this.feedRepository.updateComment(
      feedId,
      comment,
      comment,
    );

    if (!result) throw new DatabaseError('update comment failed');

    return result;
  }

  async createCommentLike(feedId: string, commentId: string) {
    const feed = await this.feedRepository.createCommentLike(
      feedId,
      commentId,
      this.token.id,
    );

    if (!feed) {
      throw new DatabaseError('create comment like failed');
    }
    return;
  }

  async createSubCommentLike(
    feedId: string,
    commentId: string,
    subCommentId: string,
  ) {
    const feed = await this.feedRepository.createSubCommentLike(
      feedId,
      commentId,
      subCommentId,
      this.token.id,
    );

    if (!feed) {
      throw new DatabaseError('create subcomment like failed');
    }
  }

  async createSubComment(feedId: string, commentId: string, content: string) {
    const message: subCommentType = {
      user: this.token.id,
      comment: content,
    };

    const updated = await this.feedRepository.createSubComment(
      feedId,
      commentId,
      message,
    );

    if (!updated.modifiedCount) throw new DatabaseError('nothing updated');

    return;
  }

  async deleteSubComment(
    feedId: string,
    commentId: string,
    subCommentId: string,
  ) {
    const updated = await this.feedRepository.deleteSubComment(
      feedId,
      commentId,
      subCommentId,
    );

    if (!updated.modifiedCount) throw new DatabaseError('nothing updated');
  }

  async updateSubComment(
    feedId: string,
    commentId: string,
    subCommentId: string,
    comment: string,
  ) {
    const updated = await this.feedRepository.updateSubComment(
      feedId,
      commentId,
      subCommentId,
      comment,
    );

    if (!updated.modifiedCount) throw new DatabaseError('nothing updated');
    return;
  }

  async toggleLike(feedId: string) {
    const feed = await this.feedRepository.findById(feedId);

    const isLikePush: boolean = await feed?.addLike(this.token.id);

    const user = await this.User.findOne({ uid: this.token.uid });
    if (!user) return;
    if (isLikePush) user.point += 2;
    else user.point -= 2;
    await user.save();
    return;
  }
}
