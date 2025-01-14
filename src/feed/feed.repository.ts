import { Model } from 'mongoose';
import { commentType, IFeed, subCommentType } from './entity/feed.entity';
import { InjectModel } from '@nestjs/mongoose';
import { FeedRepository } from './feed.repository.interface';
import { C_simpleUser } from 'src/Constants/constants';

export class MongoFeedRepository implements FeedRepository {
  constructor(
    @InjectModel('Feed')
    private readonly Feed: Model<IFeed>,
  ) {}
  async findWithQuery(
    query: any,
    start: number,
    gap: number,
    isRecent: boolean,
  ): Promise<IFeed[]> {
    return await this.Feed.find(query)
      .populate(['writer', 'like', 'comments.user'])
      .populate({
        path: 'comments.subComments.user',
        select: C_simpleUser,
      })
      .sort({ createdAt: isRecent ? -1 : 1 })
      .skip(start)
      .limit(gap);
  }
  async findById(id: string): Promise<IFeed> {
    return await this.Feed.findById(id);
  }
  async findByIdLike(id: string): Promise<IFeed> {
    return await this.Feed.findById(id).populate({
      path: 'like',
      select: 'avatar name profileImage uid _id', // 필요한 필드만 선택
    });
  }
  async findAll(
    start: number,
    gap: number,
    isRecent: boolean,
  ): Promise<IFeed[]> {
    return await this.Feed.find()
      .populate(['writer', 'like', 'comments.user'])
      .populate({
        path: 'comments.subComments.user',
        select: C_simpleUser,
      })
      .sort({ createdAt: isRecent ? -1 : 1 })
      .skip(start)
      .limit(gap);
  }
  async createFeed(feedData: any): Promise<IFeed> {
    return await this.Feed.create(feedData);
  }
  async createComment(feedId: string, message: commentType): Promise<IFeed> {
    return await this.Feed.findByIdAndUpdate(
      feedId,
      { $push: { comments: message } },
      { new: true, useFindAndModify: false },
    );
  }
  async deleteComment(feedId: string, commentId: string): Promise<any> {
    return await this.Feed.findByIdAndUpdate(
      feedId,
      { $pull: { comments: { _id: commentId } } },
      { new: true, useFindAndModify: false },
    );
  }
  async updateComment(
    feedId: string,
    commentId: string,
    comment: string,
  ): Promise<any> {
    return await this.Feed.findOneAndUpdate(
      { _id: feedId, 'comments._id': commentId },
      {
        $set: {
          'comments.$.comment': comment,
        },
      },
    );
  }
  async createCommentLike(
    feedId: string,
    commentId: string,
    userId: string,
  ): Promise<any> {
    return await this.Feed.findOneAndUpdate(
      {
        _id: feedId,
        'comments._id': commentId,
      },
      {
        $addToSet: { 'comments.$.likeList': userId },
      },
      { new: true }, // 업데이트된 도큐먼트를 반환
    );
  }
  async createSubComment(
    feedId: string,
    commentId: string,
    message: subCommentType,
  ): Promise<any> {
    return await this.Feed.updateOne(
      {
        _id: feedId,
        'comments._id': commentId,
      },
      { $push: { 'comments.$.subComments': message } },
    );
  }
  async deleteSubComment(
    feedId: string,
    commentId: string,
    subCommentId: string,
  ): Promise<any> {
    return await this.Feed.updateOne(
      {
        _id: feedId,
        'comments._id': commentId,
      },
      { $pull: { 'comments.$.subComments': { _id: subCommentId } } },
    );
  }
  async updateSubComment(
    feedId: string,
    commentId: string,
    subCommentId: string,
    comment: string,
  ): Promise<any> {
    return await this.Feed.updateOne(
      {
        _id: feedId,
        'comments._id': commentId,
        'comments.subComments._id': subCommentId,
      },
      { $set: { 'comments.$[].subComments.$[sub].comment': comment } },
      {
        arrayFilters: [{ 'sub._id': subCommentId }],
      },
    );
  }
  async createSubCommentLike(
    feedId: string,
    commentId: string,
    subCommentId: string,
    userId: string,
  ): Promise<any> {
    return await this.Feed.findOneAndUpdate(
      {
        _id: feedId,
        'comments._id': commentId,
        'comments.subComments._id': subCommentId,
      },
      {
        $addToSet: {
          'comments.$[comment].subComments.$[subComment].likeList': userId,
        },
      },
      {
        arrayFilters: [
          { 'comment._id': commentId },
          { 'subComment._id': subCommentId },
        ],
        new: true, // 업데이트된 도큐먼트를 반환
      },
    );
  }
}
