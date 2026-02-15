import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { ENTITY } from 'src/Constants/ENTITY';
import { ISquareCommentRepository } from '../core/interfaces/SquareCommentRepository.interface';
import { SquareCommentType } from '../entity/comment.entity';
import { SquareComment } from '../core/domain/SquareComment';

@Injectable()
export class MongoSquareCommentRepository implements ISquareCommentRepository {
  constructor(
    @InjectModel(DB_SCHEMA.SQUARE_COMMENT)
    private readonly squareCommentModel: Model<SquareCommentType>,
  ) { }

  async findById(commentId: string): Promise<SquareComment> {
    const commentDoc = await this.squareCommentModel
      .findById(commentId)
      .populate('user', ENTITY.USER.C_SIMPLE_USER);
    return this.mapToDomain(commentDoc);
  }

  async findSubComments(commentIds: string[]): Promise<SquareComment[]> {
    const subComments = await this.squareCommentModel
      .find({
        parentId: { $in: commentIds },
      })
      .populate('user', ENTITY.USER.C_SIMPLE_USER);
    return subComments.map((comment) => this.mapToDomain(comment));
  }

  async findByPostId(postId: string): Promise<SquareComment[]> {
    const comments = await this.squareCommentModel
      .find({ postId })
      .populate('user', ENTITY.USER.C_SIMPLE_USER);
    return comments.map((comment) => this.mapToDomain(comment));
  }

  async findByPostIds(postIds: string[]): Promise<SquareComment[]> {
    const comments = await this.squareCommentModel
      .find({ postId: { $in: postIds } })
      .populate('user', ENTITY.USER.C_SIMPLE_USER);
    return comments.map((comment) => this.mapToDomain(comment));
  }

  async save(comment: SquareComment): Promise<SquareComment> {
    await this.squareCommentModel.findByIdAndUpdate(
      comment._id,
      this.mapToDb(comment),
    );
    return this.findById(comment._id);
  }

  async create(comment: SquareComment): Promise<SquareComment> {
    const commentData = this.mapToDb(comment);
    const newCommentDoc = await this.squareCommentModel.create(commentData);
    // newCommentDoc이 Document 타입이므로, toObject()로 plain object로 변환 후 타입 단언
    return this.mapToDomain(newCommentDoc);
  }

  async delete(commentId: string): Promise<void> {
    await this.squareCommentModel.findByIdAndDelete(commentId);
  }

  mapToDomain(comment: SquareCommentType): SquareComment {
    return new SquareComment({
      _id: comment._id,
      postId: comment.postId,
      parentId: comment.parentId,
      user: comment.user as string,
      comment: comment.comment,
      likeList: comment.likeList as string[],
      createdAt: comment.createdAt,
    });
  }

  mapToDb(comment: SquareComment): Partial<SquareCommentType> {
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
