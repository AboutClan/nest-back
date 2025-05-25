import { Comment, CommentProps } from './Comment';
import { SubComment, SubCommentProps } from './SubComment';

export interface FeedProps {
  id?: string;
  title: string;
  text: string;
  images?: string[];
  writer: string; // Mongoose에서는 writer: ObjectId
  type: string;
  typeId: string;
  isAnonymous?: boolean;
  like?: string[]; // 좋아요 누른 유저 ID 배열
  comments?: CommentProps[];
  subCategory?: string;
  createdAt?: string; // 도메인에서 필요하다면
}

export class Feed {
  public _id: string;
  public title: string;
  public text: string;
  public images: string[];
  public writer: string;
  public type: string;
  public typeId: string;
  public isAnonymous: boolean;
  public like: string[];
  public comments: Comment[];
  public subCategory: string;
  public createdAt: string;

  constructor(props: FeedProps) {
    this._id = props.id || '';
    this.title = props.title;
    this.text = props.text;
    this.images = props.images ?? [];
    this.writer = props.writer;
    this.type = props.type;
    this.typeId = props.typeId;
    this.isAnonymous = props.isAnonymous ?? false;
    this.like = props.like ?? [];
    this.comments = (props.comments ?? []).map((c) => new Comment(c));
    this.subCategory = props.subCategory ?? '';
    this.createdAt = props.createdAt ?? new Date().toISOString();
  }

  public addLike(userId: string): boolean {
    const index = this.like.indexOf(userId);
    if (index === -1) {
      this.like.push(userId);
      return true;
    }
    this.like.splice(index, 1);
    return false;
  }

  public toggleLike(userId: string): boolean {
    return this.addLike(userId);
  }

  public addComment(commentProps: CommentProps): void {
    this.comments.push(new Comment(commentProps));
  }

  public removeComment(commentId: string): void {
    this.comments = this.comments.filter((c) => c._id !== commentId);
  }

  public updateComment(commentId: string, content: string): void {
    this.comments.forEach((c) => {
      if (c._id === commentId) c.comment = content;
    });
  }

  public addCommentLike(commentId: string, writerId: string): void {
    this.comments.forEach((c) => {
      if (c._id === commentId) c.addLike(writerId);
    });
  }

  public addSubComment(
    commentId: string,
    subCommentProps: SubCommentProps,
  ): string {
    let commentWriter = '';

    this.comments.forEach((c) => {
      if (c._id === commentId) {
        commentWriter = c.user;
        c.addSubComment(new SubComment(subCommentProps));
      }
    });

    return commentWriter;
  }

  public removeSubComment(commentId: string, subCommentId: string): void {
    this.comments.forEach((c) => {
      if (c._id === commentId) c.removeSubComment(subCommentId);
    });
  }

  public updateSubComment(
    commentId: string,
    subCommentId: string,
    content: string,
  ): void {
    this.comments.forEach((c) => {
      if (c._id === commentId) c.updateSubComment(subCommentId, content);
    });
  }

  public addSubCommentLike(
    commentId: string,
    subCommentId: string,
    writerId: string,
  ): void {
    this.comments.forEach((c) => {
      if (c._id === commentId) c.addSubCommentLike(subCommentId, writerId);
    });
  }

  public toPrimitives(): FeedProps {
    return {
      id: this._id,
      title: this.title,
      text: this.text,
      images: [...this.images],
      writer: this.writer,
      type: this.type,
      typeId: this.typeId,
      isAnonymous: this.isAnonymous,
      like: [...this.like],
      comments: this.comments.map((c) => c.toPrimitives()),
      subCategory: this.subCategory,
      createdAt: this.createdAt,
    };
  }
}
