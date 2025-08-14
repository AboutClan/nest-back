import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ICommentRepository } from './CommentRepository.interface';
import { ICOMMENT_REPOSITORY } from 'src/utils/di.tokens';
import { Comment, CommentProps } from 'src/domain/entities/Comment';
import { DateUtils } from 'src/utils/Date';

@Injectable()
export default class CommentService {
  constructor(
    @Inject(ICOMMENT_REPOSITORY)
    private readonly commentRepository: ICommentRepository,
  ) {}

  async findCommentsByPostId(postId: string): Promise<Comment[]> {
    const comments = await this.commentRepository.findByPostId(postId);

    const commentIds = comments.map((comment) => comment._id);

    const subComments =
      await this.commentRepository.findSubComments(commentIds);

    comments.forEach((comment: any) => {
      comment.subComments = subComments.filter(
        (subComment) =>
          subComment.parentId.toString() === comment._id.toString(),
      );
    });

    return comments;
  }

  async updateComment({
    commentId,
    content,
  }: {
    commentId: string;
    content: string;
  }): Promise<Comment> {
    const comment = await this.commentRepository.findById(commentId);
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    comment.comment = content;
    return await this.commentRepository.save(comment);
  }

  async createComment({
    comment,
    postId,
    postType,
    user,
  }: Partial<CommentProps>): Promise<Comment> {
    const newComment = new Comment({
      comment,
      postId,
      postType,
      user,
      likeList: [],
      createdAt: DateUtils.getKoreaToday(),
    });

    return await this.commentRepository.create(newComment);
  }

  async createSubComment({
    comment,
    postId,
    postType,
    parentId,
    user,
  }: Partial<CommentProps>): Promise<string> {
    const newComment = new Comment({
      comment,
      postId,
      postType,
      parentId,
      user,
      likeList: [],
      createdAt: DateUtils.getKoreaToday(),
    });

    await this.commentRepository.create(newComment);

    return (await this.commentRepository.findById(parentId)).user;
  }

  async deleteComment({ commentId }: { commentId: string }): Promise<void> {
    await this.commentRepository.delete(commentId);
  }
}
