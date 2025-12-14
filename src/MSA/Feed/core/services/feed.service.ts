import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';

import { Feed } from 'src/domain/entities/Feed/Feed';
import { ValidationError } from 'src/errors/ValidationError';

import { WEBPUSH_MSG } from 'src/Constants/WEBPUSH_MSG';
import { RequestContext } from 'src/request-context';
import ImageService from 'src/routes/imagez/image.service';
import { IUser } from 'src/MSA/User/entity/user.entity';
import { IFEED_REPOSITORY, IGATHER_REPOSITORY } from 'src/utils/di.tokens';
import { FcmService } from '../../../Notification/core/services/fcm.service';
import { IFeedRepository } from '../interfaces/FeedRepository.interface';
import { DateUtils } from 'src/utils/Date';
import { IGatherRepository } from 'src/MSA/Gather/core/interfaces/GatherRepository.interface';
import FeedCommentService from './feedComment.service';

@Injectable()
export class FeedService {
  private imageServiceInstance: ImageService;

  constructor(
    @Inject(IGATHER_REPOSITORY)
    private readonly gatherRepository: IGatherRepository,
    @Inject(IFEED_REPOSITORY)
    private readonly feedRepository: IFeedRepository,

    private readonly fcmServiceInstance: FcmService,
    private readonly commentService: FeedCommentService,
  ) {
    this.imageServiceInstance = new ImageService();
  }

  async findFeedByType(
    type?: string,
    cursor?: number | null,
    isRecent?: 'true' | 'false',
  ) {
    const token = RequestContext.getDecodedToken();

    const gap = 12;
    const start = gap * (cursor || 0);

    const feeds = await this.feedRepository.findByType(type, {
      start,
      gap,
      sort: isRecent === 'true' ? -1 : 1,
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

    const feedComments = await this.commentService.findCommentsByPostId(
      feed._id,
    );

    return {
      ...feed,
      comments: feedComments,
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

  async findByGroupId(groupId: string) {
    const gathers = await this.gatherRepository.findByGroupId(groupId, 'group');
    const gatherIds = gathers?.map((gather) => gather.id.toString());

    return await this.feedRepository.findByGroupIds(gatherIds);
  }

  async findAllFeeds(cursor: number | null, isRecent?: 'true' | 'false') {
    const token = RequestContext.getDecodedToken();

    const gap = 12;
    const start = gap * (cursor || 0);

    const feeds = await this.feedRepository.findAll({
      start,
      gap,
      isRecent,
    });
    const feedIds = feeds?.map((feed) => feed._id.toString());

    const comments = await this.commentService.findCommetsByPostIds(feedIds);

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
        comments: comments.filter(
          (comment) => comment.postId.toString() === feed._id.toString(),
        ),
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
    date,
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
      date,
    });

    await this.feedRepository.create(newFeed);

    const gather = await this.gatherRepository.findById(typeId);
    gather.hasReview = true;
    await this.gatherRepository.save(gather);

    if (!gather)
      throw new NotFoundException(`cant find gather with id ${typeId}`);

    await this.sendNotificationGather(
      gather.id.toString(),
      WEBPUSH_MSG.FEED.CREATE,
      `/feed`,
    );

    return;
  }

  async sendNotificationGather(
    gatherId: string,
    description: string,
    deeplink?: string,
  ) {
    try {
      const gather = await this.gatherRepository.findById(+gatherId);

      const memberUids = gather.participants?.map((participant) => {
        return (participant?.user as unknown as IUser)?.uid;
      });

      const memberArray = Array.from(new Set(memberUids));

      for (const memberUid of memberArray) {
        await this.fcmServiceInstance.sendNotificationToXWithId(
          memberUid,
          `새로운 모임 후기 도착!`,
          `${DateUtils.formatGatherDate(gather.date)} 모임의 후기가 올라왔어요!`,
          deeplink,
        );
      }

      return;
    } catch (err) {
      console.error(err);
      throw new HttpException(
        'Error deleting comment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async createComment(feedId: string, content: string) {
    const token = RequestContext.getDecodedToken();
    const feed = await this.feedRepository.findById(feedId);

    await this.commentService.createComment({
      postId: feed._id,
      user: token.id,
      comment: content,
    });

    //noti

    await this.fcmServiceInstance.sendNotificationToXWithId(
      feed.writer,
      WEBPUSH_MSG.FEED.COMMENT_TITLE,
      content,
      '/feed',
    );

    return;
  }

  async deleteComment(feedId: string, commentId: string) {
    await this.commentService.deleteComment({ commentId });
    return;
  }

  async updateComment(feedId: string, commentId: string, comment: string) {
    await this.commentService.updateComment({
      commentId,
      content: comment,
    });
    return;
  }

  async createCommentLike(feedId: string, commentId: string) {
    const token = RequestContext.getDecodedToken();

    await this.commentService.likeComment(commentId, token.id);
    return;
  }

  async createSubCommentLike(
    feedId: string,
    commentId: string,
    subCommentId: string,
  ) {
    const token = RequestContext.getDecodedToken();

    await this.commentService.likeComment(subCommentId, token.id);
  }

  async createSubComment(feedId: string, commentId: string, content: string) {
    const token = RequestContext.getDecodedToken();

    const feed = await this.feedRepository.findById(feedId);

    const commentWriter = await this.commentService.createSubComment({
      postId: feed._id.toString(),
      user: token.id,
      comment: content,
      parentId: commentId,
    });

    //noti
    await this.fcmServiceInstance.sendNotificationToXWithId(
      commentWriter,
      WEBPUSH_MSG.FEED.COMMENT_TITLE,
      content,
      '/feed',
    );
    await this.fcmServiceInstance.sendNotificationToXWithId(
      feed.writer,
      WEBPUSH_MSG.FEED.COMMENT_TITLE,
      content,
      '/feed',
    );
  }

  async deleteSubComment(
    feedId: string,
    commentId: string,
    subCommentId: string,
  ) {
    await this.commentService.deleteComment({ commentId: subCommentId });
    return;
  }

  async updateSubComment(
    feedId: string,
    commentId: string,
    subCommentId: string,
    comment: string,
  ) {
    await this.commentService.updateComment({
      commentId: subCommentId,
      content: comment,
    });
    return;
  }

  async toggleLike(feedId: string) {
    const token = RequestContext.getDecodedToken();
    const feed = await this.feedRepository.findById(feedId);
    const isLikePush = await feed.toggleLike(token.id);
    await this.feedRepository.save(feed);

    // if (isLikePush) {
    //   await this.userService.updatePoint(CONST.POINT.FEED_LIKE, '피드 좋아요');
    // } else {
    //   await this.userService.updatePoint(
    //     CONST.POINT.CANCEL_FEED_LIKE,
    //     '피드 좋아요 취소',
    //   );
    // }
    return;
  }

  async findMyFeed(isPopulate: boolean) {
    const token = RequestContext.getDecodedToken();
    return await this.feedRepository.findMyFeed(token.id, isPopulate);
  }

  async findReceivedFeed(isPopulate: boolean) {
    const token = RequestContext.getDecodedToken();
    let gatherIds = await this.gatherRepository.findMyGatherId(token.id);

    gatherIds = gatherIds.map((gatherId) => gatherId.id.toString());
    return await this.feedRepository.findRecievedFeed(gatherIds, isPopulate);
    // if (feedType == 'group') {
    //   let groupStudyIds = await this.groupStudyRepository.findMyGroupStudyId(
    //     token.id,
    //   );
    //   groupStudyIds = groupStudyIds.map((gatherId) => gatherId.id.toString());
    //   return await this.feedRepository.findRecievedFeed(
    //     feedType,
    //     groupStudyIds,
    //   );
    // } else if (feedType == 'gather') {
    //   let gatherIds = await this.gatherRepository.findMyGatherId(token.id);

    //   gatherIds = gatherIds.map((gatherId) => gatherId.id.toString());
    //   return await this.feedRepository.findRecievedFeed(feedType, gatherIds);
    // }
  }

  async findWrittenReview() {
    const myFeed = await this.findMyFeed(false);
    const receivedFeed = await this.findReceivedFeed(false);
    return {
      writtenReviewCnt: (myFeed || []).length,
      reviewReceived: (receivedFeed || []).length,
    };
  }

  async test() {
    const gathers = await this.gatherRepository.findAllTemp();
    const feeds = await this.feedRepository.findAllTemp();

    for (const feed of feeds) {
      if (feed.type === 'gather') {
        const gatherId = feed.typeId;
        const gather = gathers.find((gather) => gather.id == Number(gatherId));

        if (!gather) continue;
        gather.hasReview = true;
        await this.gatherRepository.save(gather);
      }
    }
    return gathers;
  }
}
