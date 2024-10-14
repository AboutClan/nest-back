import { Types } from 'mongoose';
import { SecretSquareCategory, SecretSquareItem } from './entity/square.entity';

export interface ISquareService {
  getSquareList(params: {
    category: SecretSquareCategory | 'all';
    cursorNum: number | null;
  }): Promise<SecretSquareItem[]>;

  createSquare(
    square: Partial<SecretSquareItem> & { buffers: Buffer[] },
  ): Promise<{ squareId: Types.ObjectId }>;

  deleteSquare(squareId: string): Promise<void>;

  getSquare(squareId: string): Promise<SecretSquareItem>;

  createSquareComment(params: {
    comment: string;
    squareId: string;
  }): Promise<void>;

  deleteSquareComment(params: {
    squareId: string;
    commentId: string;
  }): Promise<void>;

  createSubComment(
    squareId: string,
    commentId: string,
    content: string,
  ): Promise<void>;

  deleteSubComment(
    squareId: string,
    commentId: string,
    subCommentId: string,
  ): Promise<void>;

  updateSubComment(
    squareId: string,
    commentId: string,
    subCommentId: string,
    comment: string,
  ): Promise<void>;

  createCommentLike(squareId: string, commentId: string): Promise<void>;

  createSubCommentLike(
    squareId: string,
    commentId: string,
    subCommentId: string,
  ): Promise<void>;

  patchPoll(params: { squareId: string; pollItems: string[] }): Promise<void>;

  getCurrentPollItems(params: { squareId: string }): Promise<string[]>;

  putLikeSquare(params: { squareId: string }): Promise<void>;

  deleteLikeSquare(params: { squareId: string }): Promise<void>;

  getIsLike(params: { squareId: string }): Promise<boolean>;
}
