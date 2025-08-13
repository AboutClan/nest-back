import { Injectable } from '@nestjs/common';
import { ICommentRepository } from './CommentRepository.interface';
import { Comment } from 'src/domain/entities/Comment';
import { Model } from 'mongoose';
import { ICommentData } from './comment.entity';

@Injectable()
export class CommentRepository implements ICommentRepository {
  constructor(private readonly commentModel: Model<Comment>) {}

  async findById(commentId: string): Promise<Comment> {
    const commentDoc = await this.commentModel.findById(commentId);
    return this.mapToDomain(commentDoc);
  }

  async save(comment: Comment): Promise<Comment> {
    return null;
  }

  async create(comment: Comment): Promise<Comment> {
    const commentData = this.mapToDb(comment);
    const newCommentDoc = await this.commentModel.create(commentData);
    // newCommentDoc이 Document 타입이므로, toObject()로 plain object로 변환 후 타입 단언
    return this.mapToDomain(newCommentDoc);
  }

  mapToDomain(comment: ICommentData): Comment {
    return new Comment({
      _id: comment._id,
      postId: comment.postId,
      parentId: comment.parentId,
      postType: comment.postType,
      user: comment.user as string,
      comment: comment.comment,
      likeList: comment.likeList,
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
