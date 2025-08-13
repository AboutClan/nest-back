import { Comment } from 'src/domain/entities/Comment';

export interface ICommentRepository {
  findById(commentId: string): Promise<Comment>;
  save(comment: Comment): Promise<Comment>;
  create(comment: Comment): Promise<Comment>;
}
