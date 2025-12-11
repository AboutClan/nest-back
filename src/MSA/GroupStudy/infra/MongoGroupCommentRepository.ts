import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { ENTITY } from 'src/Constants/ENTITY';
import { GroupCommentRepository } from '../core/interfaces/GroupCommentRepository.interface';
import { GroupCommentType } from '../entity/groupComment.entity';
import { GroupComment } from '../core/domain/GroupComment';

@Injectable()
export class MongoGroupCommentRepository implements GroupCommentRepository {
  constructor(
    @InjectModel(DB_SCHEMA.GROUP_COMMENT)
    private readonly groupCommentModel: Model<GroupCommentType>,
  ) {}

  async findById(commentId: string): Promise<GroupComment> {
    const commentDoc = await this.groupCommentModel
      .findById(commentId)
      .populate('user', ENTITY.USER.C_SIMPLE_USER);
    return this.mapToDomain(commentDoc);
  }

  async findSubComments(commentIds: string[]): Promise<GroupComment[]> {
    const subComments = await this.groupCommentModel
      .find({
        parentId: { $in: commentIds },
      })
      .populate('user', ENTITY.USER.C_SIMPLE_USER);
    return subComments.map((comment) => this.mapToDomain(comment));
  }

  async findByPostId(postId: string): Promise<GroupComment[]> {
    const comments = await this.groupCommentModel
      .find({ postId })
      .populate('user', ENTITY.USER.C_SIMPLE_USER);
    return comments.map((comment) => this.mapToDomain(comment));
  }

  async findByPostIds(postIds: string[]): Promise<GroupComment[]> {
    const comments = await this.groupCommentModel
      .find({ postId: { $in: postIds } })
      .populate('user', ENTITY.USER.C_SIMPLE_USER);
    return comments.map((comment) => this.mapToDomain(comment));
  }

  async save(comment: GroupComment): Promise<GroupComment> {
    await this.groupCommentModel.findByIdAndUpdate(
      comment._id,
      this.mapToDb(comment),
    );
    return this.findById(comment._id);
  }

  async create(comment: GroupComment): Promise<GroupComment> {
    const commentData = this.mapToDb(comment);
    const newCommentDoc = await this.groupCommentModel.create(commentData);
    // newCommentDoc이 Document 타입이므로, toObject()로 plain object로 변환 후 타입 단언
    return this.mapToDomain(newCommentDoc);
  }

  async delete(commentId: string): Promise<void> {
    await this.groupCommentModel.findByIdAndDelete(commentId);
  }

  mapToDomain(comment: GroupCommentType): GroupComment {
    return new GroupComment({
      _id: comment._id,
      postId: comment.postId,
      parentId: comment.parentId,
      user: comment.user as string,
      comment: comment.comment,
      likeList: comment.likeList as string[],
      createdAt: comment.createdAt,
    });
  }

  mapToDb(comment: GroupComment): Partial<GroupCommentType> {
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
