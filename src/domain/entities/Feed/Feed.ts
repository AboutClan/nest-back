import { Comment, CommentProps } from './Comment';

export interface FeedProps {
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
  private title: string;
  private text: string;
  private images: string[];
  private writer: string;
  private type: string;
  private typeId: string;
  private isAnonymous: boolean;
  private like: string[];
  private comments: Comment[];
  private subCategory: string;
  private createdAt: string;

  constructor(props: FeedProps) {
    if (!props.title) throw new Error('title is required');
    if (!props.text) throw new Error('text is required');
    if (!props.writer) throw new Error('writerId is required');
    if (!props.type) throw new Error('type is required');
    if (!props.typeId) throw new Error('typeId is required');

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
    this.createdAt = props.createdAt ?? new Date().toISOString(); // 필요시
  }

  getTitle(): string {
    return this.title;
  }
  getText(): string {
    return this.text;
  }
  getImages(): string[] {
    return this.images;
  }
  getWriter(): string {
    return this.writer;
  }
  getIsAnonymous(): boolean {
    return this.isAnonymous;
  }
  getLike(): string[] {
    return this.like;
  }
  getComments(): Comment[] {
    return this.comments;
  }
  getCreatedAt(): string {
    return this.createdAt;
  }

  addLike(userId: string): boolean {
    const index = this.like.indexOf(userId);
    if (index === -1) {
      this.like.push(userId);
      return true;
    } else {
      this.like.splice(index, 1);
      return false;
    }
  }

  addComment(commentProps: CommentProps) {
    this.comments.push(new Comment(commentProps));
  }

  removeComment(commentId: string) {
    this.comments = this.comments.filter(
      (comment) => comment.getId() !== commentId,
    );
  }

  updateComment(commentId: string, content: string) {
    this.comments.forEach((comment) => {
      if (comment.getId() === commentId) {
        comment.setComment(content);
      }
    });
  }

  addCommentLike(commentId: string, writer: string) {
    this.comments.forEach((comment) => {
      if (comment.getId() === commentId) {
        comment.addLike(writer);
      }
    });
  }
  toPrimitives(): FeedProps {
    return {
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
