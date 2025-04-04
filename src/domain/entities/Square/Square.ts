// src/domain/entities/Square.ts
import { Comment, CommentProps } from './Comment';
import { Poll, PollProps } from './Poll';

export type SquareCategory = '일상' | '고민' | '정보' | '같이해요';
export type SquareType = 'general' | 'poll';

export interface SquareProps {
  id?: string;
  category: SquareCategory;
  title: string;
  content: string;
  type: SquareType;
  poll?: PollProps;          // optional
  images?: string[];
  authorId: string;          // DB: author -> ObjectId
  viewers?: string[];        // DB: ObjectId[]
  like?: string[];           // DB: ObjectId[]
  comments?: CommentProps[];
  createdAt?: Date;
  updatedAt?: Date;
}

export class Square {
  private id?: string;
  private category: SquareCategory;
  private title: string;
  private content: string;
  private type: SquareType;
  private poll?: Poll;
  private images: string[];
  private authorId: string;
  private viewers: string[];
  private like: string[];
  private comments: Comment[];
  private createdAt?: Date;
  private updatedAt?: Date;

  constructor(props: SquareProps) {
    if (!props.category) throw new Error('category is required');
    if (!props.title) throw new Error('title is required');
    if (!props.content) throw new Error('content is required');
    if (!props.type) throw new Error('type is required');
    if (!props.authorId) throw new Error('authorId is required');

    this.id = props.id;
    this.category = props.category;
    this.title = props.title;
    this.content = props.content;
    this.type = props.type;
    this.poll = props.poll ? new Poll(props.poll) : undefined;
    this.images = props.images ?? [];
    this.authorId = props.authorId;
    this.viewers = props.viewers ?? [];
    this.like = props.like ?? [];
    this.comments = (props.comments ?? []).map((c) => new Comment(c));
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }

  // Getter methods
  getId(): string | undefined {
    return this.id;
  }
  getCategory(): SquareCategory {
    return this.category;
  }
  getTitle(): string {
    return this.title;
  }
  getContent(): string {
    return this.content;
  }
  getType(): SquareType {
    return this.type;
  }
  getPoll(): Poll | undefined {
    return this.poll;
  }
  getImages(): string[] {
    return this.images;
  }
  getAuthorId(): string {
    return this.authorId;
  }
  getViewers(): string[] {
    return this.viewers;
  }
  getLike(): string[] {
    return this.like;
  }
  getComments(): Comment[] {
    return this.comments;
  }
  getCreatedAt(): Date | undefined {
    return this.createdAt;
  }
  getUpdatedAt(): Date | undefined {
    return this.updatedAt;
  }

  // Example domain logic
  addViewer(userId: string) {
    if (!this.viewers.includes(userId)) {
      this.viewers.push(userId);
      this.updatedAt = new Date();
    }
  }

  addLike(userId: string) {
    if (!this.like.includes(userId)) {
      this.like.push(userId);
      this.updatedAt = new Date();
    }
  }

  toPrimitives(): SquareProps {
    return {
      id: this.id,
      category: this.category,
      title: this.title,
      content: this.content,
      type: this.type,
      poll: this.poll ? this.poll.toPrimitives() : undefined,
      images: [...this.images],
      authorId: this.authorId,
      viewers: [...this.viewers],
      like: [...this.like],
      comments: this.comments.map((c) => c.toPrimitives()),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
