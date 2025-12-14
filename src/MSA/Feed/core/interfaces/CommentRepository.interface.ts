import { FeedComment } from '../domain/Comment';

export interface IFeedCommentRepository {
  findById(commentId: string): Promise<FeedComment>;
  findByPostId(postId: string): Promise<FeedComment[]>;
  findSubComments(commentIds: string[]): Promise<FeedComment[]>;
  findByPostIds(postIds: string[]): Promise<FeedComment[]>;
  save(comment: FeedComment): Promise<FeedComment>;
  create(comment: FeedComment): Promise<FeedComment>;
  delete(commentId: string): Promise<void>;
}
