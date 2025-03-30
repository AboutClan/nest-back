// src/domain/entities/gather/Comment.ts
import { SubComment, SubCommentProps } from './SubComment';

export interface CommentProps {
  userId: string;
  comment: string;
  subComments?: SubCommentProps[];
  likeList?: string[];
}

export class Comment {
  private userId: string;
  private comment: string;
  private subComments: SubComment[];
  private likeList: string[];

  constructor(props: CommentProps) {
    if (!props.userId) throw new Error('Comment userId is required');
    if (!props.comment) throw new Error('Comment text is required');

    this.userId = props.userId;
    this.comment = props.comment;
    this.subComments = (props.subComments ?? []).map(
      (sc) => new SubComment(sc),
    );
    this.likeList = props.likeList ?? [];
  }

  getUserId(): string {
    return this.userId;
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
      userId: this.userId,
      comment: this.comment,
      subComments: this.subComments.map((sc) => sc.toPrimitives()),
      likeList: [...this.likeList],
    };
  }
}
