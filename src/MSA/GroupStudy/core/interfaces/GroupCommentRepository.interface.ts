import { GroupComment } from '../domain/GroupComment';

export interface GroupCommentRepository {
  findById(commentId: string): Promise<GroupComment>;
  findByPostId(postId: string): Promise<GroupComment[]>;
  findSubComments(commentIds: string[]): Promise<GroupComment[]>;
  findByPostIds(postIds: string[]): Promise<GroupComment[]>;
  save(comment: GroupComment): Promise<GroupComment>;
  create(comment: GroupComment): Promise<GroupComment>;
  delete(commentId: string): Promise<void>;
}
