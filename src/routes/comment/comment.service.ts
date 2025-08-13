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
    parentId,
    user,
  }: Partial<CommentProps>): Promise<Comment> {
    const newComment = new Comment({
      comment,
      postId,
      postType,
      parentId,
      user,
      likeList: [],
      createdAt: DateUtils.getKoreaToday(),
    });

    return await this.commentRepository.create(newComment);
  }
}
