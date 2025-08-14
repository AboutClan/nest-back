import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ICommentRepository } from './CommentRepository.interface';
import { Comment } from 'src/domain/entities/Comment';
import { Model } from 'mongoose';
import { ICommentData } from './comment.entity';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';

@Injectable()
export class CommentRepository implements ICommentRepository {
  constructor(
    @InjectModel(DB_SCHEMA.COMMENT)
    private readonly commentModel: Model<ICommentData>,
  ) {}

  async findById(commentId: string): Promise<Comment> {
    const commentDoc = await this.commentModel.findById(commentId);
    return this.mapToDomain(commentDoc);
  }

  async findSubComments(commentIds: string[]): Promise<Comment[]> {
    const subComments = await this.commentModel.find({
      parentId: { $in: commentIds },
    });
    return subComments.map((comment) => this.mapToDomain(comment));
  }

  async findByPostId(postId: string): Promise<Comment[]> {
    const comments = await this.commentModel.find({ postId });
    return comments.map((comment) => this.mapToDomain(comment));
  }

  async findByPostIds(postIds: string[]): Promise<Comment[]> {
    const comments = await this.commentModel.find({ postId: { $in: postIds } });
    return comments.map((comment) => this.mapToDomain(comment));
  }

  async save(comment: Comment): Promise<Comment> {
    await this.commentModel.findByIdAndUpdate(
      comment._id,
      this.mapToDb(comment),
    );
    return this.findById(comment._id);
  }

  async create(comment: Comment): Promise<Comment> {
    const commentData = this.mapToDb(comment);
    const newCommentDoc = await this.commentModel.create(commentData);
    // newCommentDoc이 Document 타입이므로, toObject()로 plain object로 변환 후 타입 단언
    return this.mapToDomain(newCommentDoc);
  }

  async delete(commentId: string): Promise<void> {
    await this.commentModel.findByIdAndDelete(commentId);
  }

  mapToDomain(comment: ICommentData): Comment {
    return new Comment({
      _id: comment._id,
      postId: comment.postId,
      parentId: comment.parentId,
      postType: comment.postType,
      user: comment.user as string,
      comment: comment.comment,
      likeList: comment.likeList as string[],
      createdAt: comment.createdAt,
    });
  }

  mapToDb(comment: Comment): Partial<ICommentData> {
    return {
      _id: comment._id,
      postId: comment.postId,
      parentId: comment.parentId,
      postType: comment.postType,
      user: comment.user,
      comment: comment.comment,
      likeList: comment.likeList,
      createdAt: comment.createdAt,
    };
  }
}
