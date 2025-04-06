// src/domain/entities/Feed.ts
import { Comment, CommentProps } from './Comment';

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
  private _id: string;
  private _title: string;
  private _text: string;
  private _images: string[];
  private _writer: string;
  private _type: string;
  private _typeId: string;
  private _isAnonymous: boolean;
  private _like: string[];
  private _comments: Comment[];
  private _subCategory: string;
  private _createdAt: string;

  constructor(props: FeedProps) {
    // if (!props.title) throw new Error('title is required');
    // if (!props.text) throw new Error('text is required');
    // if (!props.writer) throw new Error('writerId is required');
    // if (!props.type) throw new Error('type is required');
    // if (!props.typeId) throw new Error('typeId is required');

    this._id = props.id || '';
    this._title = props.title;
    this._text = props.text;
    this._images = props.images ?? [];
    this._writer = props.writer;
    this._type = props.type;
    this._typeId = props.typeId;
    this._isAnonymous = props.isAnonymous ?? false;
    this._like = props.like ?? [];
    this._comments = (props.comments ?? []).map((c) => new Comment(c));
    this._subCategory = props.subCategory ?? '';
    this._createdAt = props.createdAt ?? new Date().toISOString(); // 필요시
  }

  public get id(): string {
    return this._id;
  }

  public get title(): string {
    return this._title;
  }

  public get text(): string {
    return this._text;
  }

  public get images(): string[] {
    return this._images;
  }

  public get writer(): string {
    return this._writer;
  }

  public get type(): string {
    return this._type;
  }

  public get typeId(): string {
    return this._typeId;
  }

  public get isAnonymous(): boolean {
    return this._isAnonymous;
  }

  public get like(): string[] {
    return this._like;
  }

  public get comments(): Comment[] {
    return this._comments;
  }

  public get subCategory(): string {
    return this._subCategory;
  }

  public get createdAt(): string {
    return this._createdAt;
  }

  public addLike(userId: string): boolean {
    const index = this._like.indexOf(userId);
    if (index === -1) {
      this._like.push(userId);
      return true;
    } else {
      this._like.splice(index, 1);
      return false;
    }
  }

  public addComment(commentProps: CommentProps) {
    this._comments.push(new Comment(commentProps));
  }

  public removeComment(commentId: string) {
    this._comments = this._comments.filter(
      (comment) => comment.id !== commentId,
    );
  }

  public updateComment(commentId: string, content: string) {
    this._comments.forEach((comment) => {
      if (comment.id === commentId) {
        comment.comment = content;
      }
    });
  }

  public addCommentLike(commentId: string, writer: string) {
    this._comments.forEach((comment) => {
      if (comment.id === commentId) {
        comment.addLike(writer);
      }
    });
  }

  public toPrimitives(): FeedProps {
    return {
      id: this._id,
      title: this._title,
      text: this._text,
      images: [...this._images],
      writer: this._writer,
      type: this._type,
      typeId: this._typeId,
      isAnonymous: this._isAnonymous,
      like: [...this._like],
      comments: this._comments.map((c) => c.toPrimitives()),
      subCategory: this._subCategory,
      createdAt: this._createdAt,
    };
  }
}
