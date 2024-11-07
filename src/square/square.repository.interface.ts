import { SecretSquareItem } from './entity/square.entity';

export interface SquareRepository {
  findSquareByCategory(
    category: string,
    start: number,
    gap: number,
  ): Promise<SecretSquareItem[]>;
  create(squareData: any): Promise<SecretSquareItem>;
  findByIdAndDelete(squareId: string): Promise<null>;
  findByIdAndUpdate(squareId: string, userId: string): Promise<null>;
  findByIdCustom(squareId: string, userId): Promise<SecretSquareItem>;
  updateComment(
    squareId: string,
    userId: string,
    comment: string,
  ): Promise<null>;
  deleteComment(
    userId: string,
    squareId: string,
    commentId: string,
  ): Promise<null>;
  createSubComment(
    squareId: string,
    commentId: string,
    message: any,
  ): Promise<null>;
  deleteSubComment(
    squareId: string,
    commentId: string,
    subCommentId: string,
  ): Promise<null>;
  updateSubComment(
    squareId: string,
    commentId: string,
    subCommentId: string,
    comment: string,
  ): Promise<null>;

  createCommentLike(
    squareId: string,
    commentId: string,
    userId: string,
  ): Promise<SecretSquareItem>;

  createSubCommentLike(
    squareId: string,
    commentId: string,
    subCommentId: string,
    userId: string,
  ): Promise<SecretSquareItem>;

  findById(squareId: string): Promise<SecretSquareItem>;

  deleteLikeSquare(squareId: string, userId: string): Promise<null>;
}
