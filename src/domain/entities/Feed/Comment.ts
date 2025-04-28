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
  public id: string;
  public user: string;
  public comment: string;
  public subComments: SubComment[];
  public likeList: string[];

  constructor(props: CommentProps) {
    this.id = props.id || '';
    this.user = props.user;
    this.comment = props.comment;
    this.subComments = (props.subComments ?? []).map(
      (sc) => new SubComment(sc),
    );
    this.likeList = props.likeList ?? [];
  }

  public addLike(userId: string): boolean {
    if (!this.likeList.includes(userId)) {
      this.likeList.push(userId);
      return true;
    }
    return false;
  }

  public removeLike(userId: string): boolean {
    const idx = this.likeList.indexOf(userId);
    if (idx !== -1) {
      this.likeList.splice(idx, 1);
      return true;
    }
    return false;
  }

  public addSubComment(subCommentProps: SubCommentProps) {
    this.subComments.push(new SubComment(subCommentProps));
  }

  public updateSubComment(subCommentId: string, comment: string) {
    this.subComments.forEach((subComment) => {
      if (subComment.id === subCommentId) {
        subComment.comment = comment;
      }
    });
  }

  public addSubCommentLike(subCommentId: string, writer: string) {
    this.subComments.forEach((subComment) => {
      if (subComment.id === subCommentId) {
        subComment.addLike(writer);
      }
    });
  }

  public removeSubComment(subCommentId: string) {
    this.subComments = this.subComments.filter(
      (subComment) => subComment.id !== subCommentId,
    );
  }

  public toPrimitives(): CommentProps {
    return {
      id: this.id,
      user: this.user,
      comment: this.comment,
      subComments: this.subComments.map((sc) => sc.toPrimitives()),
      likeList: [...this.likeList],
    };
  }
}
