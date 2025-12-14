import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { ENTITY } from 'src/Constants/ENTITY';
import { IFeedCommentRepository } from '../core/interfaces/CommentRepository.interface';
import { IFeedCommentData } from '../entity/feedComment.entity';
import { FeedComment } from '../core/domain/Comment';

@Injectable()
export class MongoFeedCommentRepository implements IFeedCommentRepository {
  constructor(
    @InjectModel(DB_SCHEMA.FEED_COMMENT)
    private readonly feedCommentModel: Model<IFeedCommentData>,
  ) {}

  async findById(commentId: string): Promise<FeedComment> {
    const commentDoc = await this.feedCommentModel
      .findById(commentId)
      .populate('user', ENTITY.USER.C_SIMPLE_USER);
    return this.mapToDomain(commentDoc);
  }

  async findSubComments(commentIds: string[]): Promise<FeedComment[]> {
    const subComments = await this.feedCommentModel
      .find({
        parentId: { $in: commentIds },
      })
      .populate('user', ENTITY.USER.C_SIMPLE_USER);
    return subComments.map((comment) => this.mapToDomain(comment));
  }

  async findByPostId(postId: string): Promise<FeedComment[]> {
    const comments = await this.feedCommentModel
      .find({ postId })
      .populate('user', ENTITY.USER.C_SIMPLE_USER);
    return comments.map((comment) => this.mapToDomain(comment));
  }

  async findByPostIds(postIds: string[]): Promise<FeedComment[]> {
    const comments = await this.feedCommentModel
      .find({ postId: { $in: postIds } })
      .populate('user', ENTITY.USER.C_SIMPLE_USER);
    return comments.map((comment) => this.mapToDomain(comment));
  }

  async save(comment: FeedComment): Promise<FeedComment> {
    await this.feedCommentModel.findByIdAndUpdate(
      comment._id,
      this.mapToDb(comment),
    );
    return this.findById(comment._id);
  }

  async create(comment: FeedComment): Promise<FeedComment> {
    const commentData = this.mapToDb(comment);
    const newCommentDoc = await this.feedCommentModel.create(commentData);
    // newCommentDoc이 Document 타입이므로, toObject()로 plain object로 변환 후 타입 단언
    return this.mapToDomain(newCommentDoc);
  }

  async delete(commentId: string): Promise<void> {
    await this.feedCommentModel.findByIdAndDelete(commentId);
  }

  mapToDomain(comment: IFeedCommentData): FeedComment {
    return new FeedComment({
      _id: comment._id,
      postId: comment.postId,
      parentId: comment.parentId,
      user: comment.user as string,
      comment: comment.comment,
      likeList: comment.likeList as string[],
      createdAt: comment.createdAt,
    });
  }

  mapToDb(comment: FeedComment): Partial<IFeedCommentData> {
    return {
      _id: comment._id,
      postId: comment.postId,
      parentId: comment.parentId,
      user: comment.user,
      comment: comment.comment,
      likeList: comment.likeList,
      createdAt: comment.createdAt,
    };
  }
}
