import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DateUtils } from 'src/utils/Date';
import { IFEEDCOMMENT_REPOSITORY } from 'src/utils/di.tokens';
import { IFeedCommentRepository } from '../interfaces/CommentRepository.interface';
import { FeedComment, FeedCommentProps } from '../domain/Comment';

@Injectable()
export default class FeedCommentService {
  constructor(
    @Inject(IFEEDCOMMENT_REPOSITORY)
    private readonly feedCommentRepository: IFeedCommentRepository,
  ) {}

  async likeComment(commentId: string, userId: string): Promise<void> {
    const comment = await this.feedCommentRepository.findById(commentId);
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    comment.toggleLike(userId);
    await this.feedCommentRepository.save(comment);
  }

  async findCommentsByPostId(postId: string): Promise<FeedComment[]> {
    // 1) post의 모든 댓글(원댓글+대댓글) 조회
    const all = await this.feedCommentRepository.findByPostId(postId);

    // 2) 원댓글만 남기기 (parentId가 없거나 null)
    const topLevel = all.filter((c) => !c.parentId);

    // 3) parentId 기준으로 대댓글 버킷 만들기
    const bucket = new Map<string, FeedComment[]>();
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

  async findCommetsByPostIds(postIds: string[]): Promise<FeedComment[]> {
    const comments = await this.feedCommentRepository.findByPostIds(postIds);

    const commentIds = comments.map((comment) => comment._id.toString());

    const subComments =
      await this.feedCommentRepository.findSubComments(commentIds);

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
  }): Promise<FeedComment> {
    const comment = await this.feedCommentRepository.findById(commentId);
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    comment.comment = content;

    await this.feedCommentRepository.save(comment);
    return await this.feedCommentRepository.save(comment);
  }

  async createComment({
    comment,
    postId,
    user,
    likeList,
  }: Partial<FeedCommentProps>): Promise<FeedComment> {
    const newComment = new FeedComment({
      comment,
      postId,
      user,
      likeList: likeList || [],
      createdAt: DateUtils.getKoreaToday(),
    });

    return await this.feedCommentRepository.create(newComment);
  }

  async createSubComment({
    comment,
    postId,
    parentId,
    user,
    likeList,
  }: Partial<FeedCommentProps>): Promise<string> {
    const newComment = new FeedComment({
      comment,
      postId,
      parentId,
      user,
      likeList: likeList || [],
      createdAt: DateUtils.getKoreaToday(),
    });

    await this.feedCommentRepository.create(newComment);

    return (await this.feedCommentRepository.findById(parentId)).user;
  }

  async deleteComment({ commentId }: { commentId: string }): Promise<void> {
    await this.feedCommentRepository.delete(commentId);
  }
}
