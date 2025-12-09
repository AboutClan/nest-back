import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { ENTITY } from 'src/Constants/ENTITY';
import { IGatherCommentRepository } from '../core/interfaces/GatherCommentRepository.interface';
import { GatherCommentType } from '../entity/comment.entity';
import { GatherComment } from '../core/domain/GatherComment';

@Injectable()
export class MongoGatherCommentRepository implements IGatherCommentRepository {
  constructor(
    @InjectModel(DB_SCHEMA.GATHER_COMMENT)
    private readonly gatherCommentModel: Model<GatherCommentType>,
  ) {}

  async findById(commentId: string): Promise<GatherComment> {
    const commentDoc = await this.gatherCommentModel
      .findById(commentId)
      .populate('user', ENTITY.USER.C_SIMPLE_USER);
    return this.mapToDomain(commentDoc);
  }

  async findSubComments(commentIds: string[]): Promise<GatherComment[]> {
    const subComments = await this.gatherCommentModel
      .find({
        parentId: { $in: commentIds },
      })
      .populate('user', ENTITY.USER.C_SIMPLE_USER);
    return subComments.map((comment) => this.mapToDomain(comment));
  }

  async findByPostId(postId: string): Promise<GatherComment[]> {
    const comments = await this.gatherCommentModel
      .find({ postId })
      .populate('user', ENTITY.USER.C_SIMPLE_USER);
    return comments.map((comment) => this.mapToDomain(comment));
  }

  async findByPostIds(postIds: string[]): Promise<GatherComment[]> {
    const comments = await this.gatherCommentModel
      .find({ postId: { $in: postIds } })
      .populate('user', ENTITY.USER.C_SIMPLE_USER);
    return comments.map((comment) => this.mapToDomain(comment));
  }

  async save(comment: GatherComment): Promise<GatherComment> {
    await this.gatherCommentModel.findByIdAndUpdate(
      comment._id,
      this.mapToDb(comment),
    );
    return this.findById(comment._id);
  }

  async create(comment: GatherComment): Promise<GatherComment> {
    const commentData = this.mapToDb(comment);
    const newCommentDoc = await this.gatherCommentModel.create(commentData);
    // newCommentDoc이 Document 타입이므로, toObject()로 plain object로 변환 후 타입 단언
    return this.mapToDomain(newCommentDoc);
  }

  async delete(commentId: string): Promise<void> {
    await this.gatherCommentModel.findByIdAndDelete(commentId);
  }

  mapToDomain(comment: GatherCommentType): GatherComment {
    return new GatherComment({
      _id: comment._id,
      postId: comment.postId,
      parentId: comment.parentId,
      user: comment.user as string,
      comment: comment.comment,
      likeList: comment.likeList as string[],
      createdAt: comment.createdAt,
    });
  }

  mapToDb(comment: GatherComment): Partial<GatherCommentType> {
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
