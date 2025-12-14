import { GatherComment } from '../domain/GatherComment';

export interface IGatherCommentRepository {
  findById(commentId: string): Promise<GatherComment>;
  findByPostId(postId: string): Promise<GatherComment[]>;
  findSubComments(commentIds: string[]): Promise<GatherComment[]>;
  findByPostIds(postIds: string[]): Promise<GatherComment[]>;
  save(comment: GatherComment): Promise<GatherComment>;
  create(comment: GatherComment): Promise<GatherComment>;
  delete(commentId: string): Promise<void>;
}
