// src/domain/entities/Comment.ts
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
    if (!props.userId) throw new Error('userId is required');
    if (!props.comment) throw new Error('comment is required');
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

  addSubComment(scProps: SubCommentProps): void {
    this.subComments.push(new SubComment(scProps));
  }

  addLike(userId: string): void {
    if (!this.likeList.includes(userId)) {
      this.likeList.push(userId);
    }
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
