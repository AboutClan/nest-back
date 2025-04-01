// src/domain/entities/Comment.ts
import { SubComment, SubCommentProps } from './SubComment';

export interface CommentProps {
  user: string;
  comment: string;
  subComments?: SubCommentProps[];
  likeList?: string[];
}

export class Comment {
  private user: string;
  private comment: string;
  private subComments: SubComment[];
  private likeList: string[];

  constructor(props: CommentProps) {
    if (!props.user) throw new Error('userId is required');
    if (!props.comment) throw new Error('comment is required');

    this.user = props.user;
    this.comment = props.comment;
    this.subComments = (props.subComments ?? []).map(
      (sc) => new SubComment(sc),
    );
    this.likeList = props.likeList ?? [];
  }

  getUser(): string {
    return this.user;
  }

  getComment(): string {
    return this.comment;
  }

  getSubComments(): SubComment[] {
    return this.subComments;
  }

  getLikeList(): string[] {
    return this.likeList;
  }

  addLike(userId: string): boolean {
    if (!this.likeList.includes(userId)) {
      this.likeList.push(userId);
      return true;
    }
    return false;
  }

  removeLike(userId: string): boolean {
    const idx = this.likeList.indexOf(userId);
    if (idx !== -1) {
      this.likeList.splice(idx, 1);
      return true;
    }
    return false;
  }

  addSubComment(subCommentProps: SubCommentProps) {
    this.subComments.push(new SubComment(subCommentProps));
  }

  toPrimitives(): CommentProps {
    return {
      user: this.user,
      comment: this.comment,
      subComments: this.subComments.map((sc) => sc.toPrimitives()),
      likeList: [...this.likeList],
    };
  }
}
