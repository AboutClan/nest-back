import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';

import { Feed } from 'src/domain/entities/Feed/Feed';
import { SubCommentProps } from 'src/domain/entities/Feed/SubComment';
import { DatabaseError } from 'src/errors/DatabaseError';
import { ValidationError } from 'src/errors/ValidationError';

import { CONST } from 'src/Constants/CONSTANTS';
import { WEBPUSH_MSG } from 'src/Constants/WEBPUSH_MSG';
import ImageService from 'src/imagez/image.service';
import { RequestContext } from 'src/request-context';
import { GroupStudyRepository } from 'src/routes/groupStudy/groupStudy.repository.interface';
import { IUser } from 'src/routes/user/user.entity';
import { UserService } from 'src/routes/user/user.service';
import { WebPushService } from 'src/routes/webpush/webpush.service';
import {
  IFEED_REPOSITORY,
  IGATHER_REPOSITORY,
  IGROUPSTUDY_REPOSITORY,
} from 'src/utils/di.tokens';
import { IGatherRepository } from '../gather/GatherRepository.interface';
import { IFeedRepository } from './FeedRepository.interface';

@Injectable()
export class FeedService {
  private imageServiceInstance: ImageService;

  constructor(
    @Inject(IGROUPSTUDY_REPOSITORY)
    private readonly groupStudyRepository: GroupStudyRepository,
    @Inject(IGATHER_REPOSITORY)
    private readonly gatherRepository: IGatherRepository,
    @Inject(IFEED_REPOSITORY)
    private readonly feedRepository: IFeedRepository,

    private readonly userService: UserService,
    private readonly webPushServiceInstance: WebPushService,
  ) {
    this.imageServiceInstance = new ImageService();
  }

  async findFeedByType(
    type?: string,

    cursor?: number | null,
    isRecent?: boolean,
  ) {
    const token = RequestContext.getDecodedToken();

    const gap = 12;
    const start = gap * (cursor || 0);

    const feeds = await this.feedRepository.findByType(type, {
      start,
      gap,
      sort: isRecent ? -1 : 1,
    });

    return feeds?.map((feed) => {
      const myLike = (feed?.like as unknown as IUser[])?.find(
        (who) => who.uid === token.uid,
      );
      let modifiedLike;
      if (myLike) {
        modifiedLike = [
          myLike,
          ...(feed.like as unknown as IUser[])
            .filter((who) => who.uid !== myLike.uid)
            .slice(0, 7),
        ];
      } else {
        modifiedLike = feed.like.slice(0, 8);
      }
      return {
        ...feed,
        like: modifiedLike,
        likeCnt: feed?.like?.length,
      };
    });
  }

  async findFeedById(id: string) {
    const token = RequestContext.getDecodedToken();
    const feed = await this.feedRepository.findById(id);
    if (!feed) throw new NotFoundException(`cant find feed with id ${id}`);

    const myLike = (feed?.like as unknown as IUser[])?.find(
      (who) => who.uid === token.uid,
    );
    let modifiedLike;
    if (myLike) {
      modifiedLike = [
        myLike,
        ...(feed?.like as unknown as IUser[])
          .filter((who) => who.uid !== myLike.uid)
          .slice(0, 7),
      ];
    } else {
      modifiedLike = feed?.like.slice(0, 8);
    }

    return {
      ...feed,
      like: modifiedLike,
      likeCnt: feed?.like?.length,
    };
  }

  async findFeedLikeById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new ValidationError('invalid mongoDB Id type');
    }
    const feed = await this.feedRepository.findByIdJoin(id);
    if (!feed) throw new NotFoundException(`cant find feed with id ${id}`);

    return feed?.like as unknown as IUser[];
  }

  async findAllFeeds(cursor: number | null, isRecent?: boolean) {
    const token = RequestContext.getDecodedToken();

    const gap = 12;
    const start = gap * (cursor || 0);

    const feeds = await this.feedRepository.findAll({ start, gap, isRecent });
    return feeds?.map((feed) => {
      const myLike = (feed?.like as unknown as IUser[])?.find(
        (who) => who.uid === token.uid,
      );
      let modifiedLike;
      if (myLike) {
        modifiedLike = [
          myLike,
          ...(feed.like as unknown as IUser[])
            .filter((who) => who.uid !== myLike.uid)
            .slice(0, 7),
        ];
      } else {
        modifiedLike = feed.like.slice(0, 8);
      }
      return {
        ...feed,
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
    const token = RequestContext.getDecodedToken();

    const images = await this.imageServiceInstance.uploadImgCom(
      'feed',
      buffers,
    );

    const newFeed = new Feed({
      title,
      text,
      writer: token.id,
      type,
      typeId,
      images,
      isAnonymous,
      subCategory,
    });

    await this.feedRepository.create(newFeed);

    if (type === 'gather') {
      const gather = await this.gatherRepository.findById(typeId);
      if (!gather)
        throw new NotFoundException(`cant find gather with id ${typeId}`);

      await this.webPushServiceInstance.sendNotificationGather(
        gather.id.toString(),
        WEBPUSH_MSG.FEED.CREATE,
      );
    }

    return;
  }

  async createComment(feedId: string, content: string) {
    const token = RequestContext.getDecodedToken();
    const feed = await this.feedRepository.findById(feedId);

    feed.addComment({
      user: token.id,
      comment: content,
    });

    const newComment = await this.feedRepository.save(feed);
    if (!newComment) throw new DatabaseError('create comment failed');

    //noti
    this.webPushServiceInstance.sendNotificationToXWithId(
      feed.writer,
      WEBPUSH_MSG.FEED.COMMENT_TITLE,
      content,
    );

    return;
  }

  async deleteComment(feedId: string, commentId: string) {
    const feed = await this.feedRepository.findById(feedId);
    feed.removeComment(commentId);
    await this.feedRepository.save(feed);
    return;
  }

  async updateComment(feedId: string, commentId: string, comment: string) {
    const feed = await this.feedRepository.findById(feedId);
    feed.updateComment(commentId, comment);
    await this.feedRepository.save(feed);
    return;
  }

  async createCommentLike(feedId: string, commentId: string) {
    const token = RequestContext.getDecodedToken();

    const feed = await this.feedRepository.findById(feedId);
    feed.updateComment(commentId, token.id);
    await this.feedRepository.save(feed);
    return;
  }

  async createSubCommentLike(
    feedId: string,
    commentId: string,
    subCommentId: string,
  ) {
    const token = RequestContext.getDecodedToken();

    const feed = await this.feedRepository.findById(feedId);
    feed.addSubCommentLike(commentId, subCommentId, token.id);
    await this.feedRepository.save(feed);
  }

  async createSubComment(feedId: string, commentId: string, content: string) {
    const token = RequestContext.getDecodedToken();
    const message: SubCommentProps = {
      user: token.id,
      comment: content,
    };

    const feed = await this.feedRepository.findById(feedId);
    const commentWriter = feed.addSubComment(commentId, message);
    await this.feedRepository.save(feed);

    //noti
    this.webPushServiceInstance.sendNotificationToXWithId(
      commentWriter,
      WEBPUSH_MSG.FEED.COMMENT_TITLE,
      content,
    );
    this.webPushServiceInstance.sendNotificationToXWithId(
      feed.writer,
      WEBPUSH_MSG.FEED.COMMENT_TITLE,
      content,
    );
  }

  async deleteSubComment(
    feedId: string,
    commentId: string,
    subCommentId: string,
  ) {
    const feed = await this.feedRepository.findById(feedId);
    feed.removeSubComment(commentId, subCommentId);
    await this.feedRepository.save(feed);
    return;
  }

  async updateSubComment(
    feedId: string,
    commentId: string,
    subCommentId: string,
    comment: string,
  ) {
    const feed = await this.feedRepository.findById(feedId);
    feed.updateSubComment(commentId, subCommentId, comment);
    await this.feedRepository.save(feed);
    return;
  }

  async toggleLike(feedId: string) {
    const token = RequestContext.getDecodedToken();
    const feed = await this.feedRepository.findById(feedId);
    const isLikePush = await feed.toggleLike(token.id);
    await this.feedRepository.save(feed);

    if (isLikePush) {
      await this.userService.updatePoint(CONST.POINT.FEED_LIKE, '피드 좋아요');
    } else {
      await this.userService.updatePoint(
        CONST.POINT.CANCEL_FEED_LIKE,
        '피드 좋아요 취소',
      );
    }
    return;
  }

  async findMyFeed(feedType: 'gather' | 'group') {
    const token = RequestContext.getDecodedToken();
    return await this.feedRepository.findMyFeed(feedType, token.id);
  }

  async findReceivedFeed(feedType: 'gather' | 'group') {
    const token = RequestContext.getDecodedToken();

    if (feedType == 'group') {
      let groupStudyIds = await this.groupStudyRepository.findMyGroupStudyId(
        token.id,
      );
      groupStudyIds = groupStudyIds.map((gatherId) => gatherId.id.toString());
      return await this.feedRepository.findRecievedFeed(
        feedType,
        groupStudyIds,
      );
    } else if (feedType == 'gather') {
      let gatherIds = await this.gatherRepository.findMyGatherId(token.id);

      gatherIds = gatherIds.map((gatherId) => gatherId.id.toString());
      return await this.feedRepository.findRecievedFeed(feedType, gatherIds);
    }
  }

  async findWrittenReview(feedType: 'gather' | 'group') {
    const myFeed = await this.findMyFeed(feedType);
    const receivedFeed = await this.findReceivedFeed(feedType);
    return {
      writtenReviewCnt: (myFeed || []).length,
      reviewReceived: (receivedFeed || []).length,
    };
  }
}
