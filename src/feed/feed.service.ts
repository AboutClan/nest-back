import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { CANCEL_FEED_LIKE_POINT, FEED_LIKE_POINT } from 'src/Constants/point';
import { Feed } from 'src/domain/entities/Feed/Feed';
import { DatabaseError } from 'src/errors/DatabaseError';
import { ValidationError } from 'src/errors/ValidationError';
import { GatherRepository } from 'src/gather/gather.repository.interface';
import { GroupStudyRepository } from 'src/groupStudy/groupStudy.repository.interface';
import ImageService from 'src/imagez/image.service';
import { RequestContext } from 'src/request-context';
import { IUser } from 'src/user/user.entity';
import { UserService } from 'src/user/user.service';
import {
  IFEED_REPOSITORY,
  IGATHER_REPOSITORY,
  IGROUPSTUDY_REPOSITORY,
} from 'src/utils/di.tokens';
import { subCommentType } from './feed.entity';
import { IFeedRepository } from './FeedRepository.interface';
import { SubCommentProps } from 'src/domain/entities/Feed/SubComment';

@Injectable()
export class FeedService {
  private imageServiceInstance: ImageService;

  constructor(
    @Inject(IGROUPSTUDY_REPOSITORY)
    private readonly groupStudyRepository: GroupStudyRepository,
    @Inject(IGATHER_REPOSITORY)
    private readonly gatherRepository: GatherRepository,

    @Inject(IFEED_REPOSITORY)
    private readonly feedRepository: IFeedRepository,
    private readonly userService: UserService,
  ) {
    this.imageServiceInstance = new ImageService();
  }

  async findFeedByType(
    type?: string,
    typeId?: string,
    cursor?: number | null,
    isRecent?: boolean,
  ) {
    const token = RequestContext.getDecodedToken();

    const gap = 12;
    const start = gap * (cursor || 0);

    const feeds = await this.feedRepository.findByType(type, {
      start,
      gap,
      sort: !isRecent,
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

    if (!Types.ObjectId.isValid(id)) {
      throw new ValidationError('invalid mongoDB Id type');
    }
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
      isAnonymous: Boolean(isAnonymous),
      subCategory,
    });
    await this.feedRepository.create(newFeed);
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
    feed.addSubComment(commentId, message);
    await this.feedRepository.save(feed);
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
    const isLikePush = feed.toggleLike(token.id);

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
    const token = RequestContext.getDecodedToken();
    return await this.feedRepository.findMyFeed(feedType, token.id);
  }

  async findReceivedFeed(feedType: 'gather' | 'group') {
    const token = RequestContext.getDecodedToken();
    let groupStudyIds = await this.groupStudyRepository.findMyGroupStudyId(
      token.id,
    );
    let gatherIds = await this.gatherRepository.findMyGatherId(token.id);
    groupStudyIds = groupStudyIds.map((gatherId) => gatherId.id.toString());
    gatherIds = gatherIds.map((gatherId) => gatherId.id.toString());

    if (feedType == 'gather') {
      return await this.feedRepository.findRecievedFeed(
        feedType,
        groupStudyIds,
      );
    } else if (feedType == 'group') {
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
