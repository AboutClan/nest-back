import { commentType, IFeed, subCommentType } from './feed.entity';

export interface FeedRepository {
  findWithQuery(
    query: any,
    start: number,
    gap: number,
    isRecent: boolean,
  ): Promise<IFeed[]>;
  findById(id: string): Promise<IFeed>;
  findByIdLike(id: string): Promise<IFeed>;
  findAll(
    start: number,
    gap: number,
    isRecent: 'true' | 'false',
  ): Promise<IFeed[]>;
  createFeed(feedData): Promise<IFeed>;
  createComment(feedId: string, message: commentType): Promise<IFeed>;
  deleteComment(feedId: string, commentId: string): Promise<any>;
  updateComment(
    feedId: string,
    commentId: string,
    comment: string,
  ): Promise<any>;
  createCommentLike(
    feedId: string,
    commentId: string,
    userId: string,
  ): Promise<any>;

  createSubComment(
    feedId: string,
    commentId: string,
    message: subCommentType,
  ): Promise<any>;
  deleteSubComment(
    feedId: string,
    commentId: string,
    subCommentId: string,
  ): Promise<any>;
  updateSubComment(
    feedId: string,
    commentId: string,
    subCommentId: string,
    comment: string,
  ): Promise<any>;
  createSubCommentLike(
    feedId: string,
    commentId: string,
    subCommentId: string,
    userId: string,
  ): Promise<any>;

  findMyFeed(feedType: string, userId: string);
  findRecievedFeed(feedType: string, idArr: string[]);
}
