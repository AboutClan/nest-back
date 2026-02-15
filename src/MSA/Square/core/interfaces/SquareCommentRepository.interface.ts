import { SquareComment } from '../domain/SquareComment';

export interface ISquareCommentRepository {
  findById(commentId: string): Promise<SquareComment>;
  findByPostId(postId: string): Promise<SquareComment[]>;
  findSubComments(commentIds: string[]): Promise<SquareComment[]>;
  findByPostIds(postIds: string[]): Promise<SquareComment[]>;
  save(comment: SquareComment): Promise<SquareComment>;
  create(comment: SquareComment): Promise<SquareComment>;
  delete(commentId: string): Promise<void>;
}
