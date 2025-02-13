import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { Types } from 'mongoose';
import { JWT } from 'next-auth/jwt';
import { DatabaseError } from 'src/errors/DatabaseError';
import { ValidationError } from 'src/errors/ValidationError';
import ImageService from 'src/imagez/image.service';
import { IUser } from 'src/user/user.entity';
import {
  IFEED_REPOSITORY,
  IGATHER_REPOSITORY,
  IGROUPSTUDY_REPOSITORY,
} from 'src/utils/di.tokens';
import { commentType, FeedZodSchema, subCommentType } from './feed.entity';
import { FeedRepository } from './feed.repository.interface';
import { CANCEL_FEED_LIKE_POINT, FEED_LIKE_POINT } from 'src/Constants/point';
import { UserService } from 'src/user/user.service';
import { GroupStudyRepository } from 'src/groupStudy/groupStudy.repository.interface';
import { GatherRepository } from 'src/gather/gather.repository.interface';

@Injectable()
export class FeedService {
  private token: JWT;
  private imageServiceInstance: ImageService;

  constructor(
    @Inject(IGROUPSTUDY_REPOSITORY)
    private readonly groupStudyRepository: GroupStudyRepository,
    @Inject(IGATHER_REPOSITORY)
    private readonly gatherRepository: GatherRepository,

    @Inject(IFEED_REPOSITORY)
    private readonly feedRepository: FeedRepository,
    @Inject(REQUEST) private readonly request: Request, // Request 객체 주입
    private readonly userService: UserService,
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
    if (!feed) throw new NotFoundException(`cant find feed with id ${id}`);

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
    if (!feed) throw new NotFoundException(`cant find feed with id ${id}`);

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

    const newComment = await this.feedRepository.createComment(feedId, message);
    if (!newComment) throw new DatabaseError('create comment failed');
    return;
  }

  async deleteComment(feedId: string, commentId: string) {
    await this.feedRepository.deleteComment(feedId, commentId);
    return;
  }

  async updateComment(feedId: string, commentId: string, comment: string) {
    await this.feedRepository.updateComment(feedId, commentId, comment);
    return;
  }

  async createCommentLike(feedId: string, commentId: string) {
    const newComment = await this.feedRepository.createCommentLike(
      feedId,
      commentId,
      this.token.id,
    );
    if (!newComment) {
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

    if (isLikePush) {
      await this.userService.updatePoint(FEED_LIKE_POINT, '피드 좋아요');
    } else {
      await this.userService.updatePoint(
        CANCEL_FEED_LIKE_POINT,
        '피드 좋아요 취소',
      );
    }
    return;
  }

  async findMyFeed(feedType: 'gather' | 'group') {
    return await this.feedRepository.findMyFeed(feedType, this.token.id);
  }
  async findRecievedFeed(feedType: 'gather' | 'group') {
    let groupStudyIds = await this.groupStudyRepository.findMyGroupStudyId(
      this.token.id,
    );
    let gatherIds = await this.gatherRepository.findMyGatherId(this.token.id);

    groupStudyIds = groupStudyIds.map((gatherId) => gatherId.id.toString());
    gatherIds = gatherIds.map((gatherId) => gatherId.id.toString());

    if (feedType == 'gather') {
      return await this.feedRepository.findRecievedFeed(
        feedType,
        groupStudyIds,
      );
    } else if (feedType == 'group') {
      console.log(gatherIds);
      return await this.feedRepository.findRecievedFeed(feedType, gatherIds);
    }
  }
}
