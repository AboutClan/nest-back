import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Comment, CommentProps } from 'src/domain/entities/Comment';
import { DateUtils } from 'src/utils/Date';
import { ICOMMENT_REPOSITORY } from 'src/utils/di.tokens';
import { ICommentRepository } from './CommentRepository.interface';

@Injectable()
export default class CommentService {
  constructor(
    @Inject(ICOMMENT_REPOSITORY)
    private readonly commentRepository: ICommentRepository,
  ) {}

  async likeComment(commentId: string, userId: string): Promise<void> {
    const comment = await this.commentRepository.findById(commentId);
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    comment.toggleLike(userId);
    await this.commentRepository.save(comment);
  }

  async findCommentsByPostId(postId: string): Promise<Comment[]> {
    // 1) post의 모든 댓글(원댓글+대댓글) 조회
    const all = await this.commentRepository.findByPostId(postId);

    // 2) 원댓글만 남기기 (parentId가 없거나 null)
    const topLevel = all.filter((c) => !c.parentId);

    // 3) parentId 기준으로 대댓글 버킷 만들기
    const bucket = new Map<string, Comment[]>();
    for (const c of all) {
      if (c.parentId) {
        const key = c.parentId.toString();
        if (!bucket.has(key)) bucket.set(key, []);
        bucket.get(key)!.push(c);
      }
    }

    // 4) 원댓글마다 subComments 매핑해서 반환 (원본 불변)
    return topLevel.map((c: any) => ({
      ...c,
      subComments: bucket.get(c._id.toString()) ?? [],
    }));
  }

  async findCommetsByPostIds(postIds: string[]): Promise<Comment[]> {
    const comments = await this.commentRepository.findByPostIds(postIds);

    const commentIds = comments.map((comment) => comment._id.toString());

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

    await this.commentRepository.save(comment);
    return await this.commentRepository.save(comment);
  }

  async createComment({
    comment,
    postId,
    postType,
    user,
    likeList,
  }: Partial<CommentProps>): Promise<Comment> {
    const newComment = new Comment({
      comment,
      postId,
      postType,
      user,
      likeList: likeList || [],
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
    likeList,
  }: Partial<CommentProps>): Promise<string> {
    const newComment = new Comment({
      comment,
      postId,
      postType,
      parentId,
      user,
      likeList: likeList || [],
      createdAt: DateUtils.getKoreaToday(),
    });

    await this.commentRepository.create(newComment);

    return (await this.commentRepository.findById(parentId)).user;
  }

  async deleteComment({ commentId }: { commentId: string }): Promise<void> {
    await this.commentRepository.delete(commentId);
  }
}
