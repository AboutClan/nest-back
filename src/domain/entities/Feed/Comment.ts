// src/domain/entities/Comment.ts
import { SubComment, SubCommentProps } from './SubComment';

export interface CommentProps {
  id?: string;
  user: string;
  comment: string;
  subComments?: SubCommentProps[];
  likeList?: string[];
}

export class Comment {
  private _id: string;
  private _user: string;
  private _comment: string;
  private _subComments: SubComment[];
  private _likeList: string[];

  constructor(props: CommentProps) {
    this._id = props.id || '';
    this._user = props.user;
    this._comment = props.comment;
    this._subComments = (props.subComments ?? []).map(
      (sc) => new SubComment(sc),
    );
    this._likeList = props.likeList ?? [];
  }

  public get id(): string {
    return this._id;
  }

  public get user(): string {
    return this._user;
  }

  public get comment(): string {
    return this._comment;
  }

  // set 메서드를 사용하면, comment.comment = "new value" 같은 식으로 할당할 수 있습니다.
  public set comment(value: string) {
    this._comment = value;
  }

  public get subComments(): SubComment[] {
    return this._subComments;
  }

  public get likeList(): string[] {
    return this._likeList;
  }

  public addLike(userId: string): boolean {
    if (!this._likeList.includes(userId)) {
      this._likeList.push(userId);
      return true;
    }
    return false;
  }

  public removeLike(userId: string): boolean {
    const idx = this._likeList.indexOf(userId);
    if (idx !== -1) {
      this._likeList.splice(idx, 1);
      return true;
    }
    return false;
  }

  public addSubComment(subCommentProps: SubCommentProps) {
    this._subComments.push(new SubComment(subCommentProps));
  }

  public updateSubComment(subCommentId, comment) {
    this._subComments.forEach((subComment) => {
      if (subComment.id === subCommentId) {
        subComment.comment = comment;
      }
    });
  }

  public addSubCommentLike(subCommentID, writer) {
    this._subComments.forEach((subComment) => {
      if (subComment.id === subCommentID) {
        subComment.addLike(writer);
      }
    });
  }

  public removeSubComment(subCommentId: string) {
    this._subComments.filter((subComment) => subComment.id !== subCommentId);
  }

  public toPrimitives(): CommentProps {
    return {
      id: this._id,
      user: this._user,
      comment: this._comment,
      subComments: this._subComments.map((sc) => sc.toPrimitives()),
      likeList: [...this._likeList],
    };
  }
}
