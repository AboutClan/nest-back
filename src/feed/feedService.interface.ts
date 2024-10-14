import { IFeed, commentType, subCommentType } from '../entity/feed.entity';

export interface IFeedService {
  findFeedByType(
    type?: string,
    typeId?: string,
    cursor?: number | null,
    isRecent?: boolean,
  ): Promise<IFeed[]>;

  findFeedById(id: string): Promise<IFeed | null>;

  findFeedLikeById(id: string): Promise<any>;

  findAllFeeds(cursor: number | null, isRecent?: boolean): Promise<IFeed[]>;

  createFeed(data: {
    title: string;
    text: string;
    type: string;
    buffers: Buffer[];
    typeId: string;
    isAnonymous: boolean;
    subCategory: string;
  }): Promise<void>;

  createComment(feedId: string, content: string): Promise<void>;

  deleteComment(feedId: string, commentId: string): Promise<void>;

  updateComment(
    feedId: string,
    commentId: string,
    comment: string,
  ): Promise<IFeed | null>;

  createCommentLike(feedId: string, commentId: string): Promise<void>;

  createSubCommentLike(
    feedId: string,
    commentId: string,
    subCommentId: string,
  ): Promise<void>;

  createSubComment(
    feedId: string,
    commentId: string,
    content: string,
  ): Promise<void>;

  deleteSubComment(
    feedId: string,
    commentId: string,
    subCommentId: string,
  ): Promise<void>;

  updateSubComment(
    feedId: string,
    commentId: string,
    subCommentId: string,
    comment: string,
  ): Promise<void>;

  toggleLike(feedId: string): Promise<void>;
}
