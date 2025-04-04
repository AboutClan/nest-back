// src/domain/entities/Request.ts
import { Rest, RestProps } from './Rest';

/** Request category type */
export type RequestCategory =
  | '건의'
  | '신고'
  | '홍보'
  | '휴식'
  | '충전'
  | '탈퇴'
  | '출석'
  | '배지'
  | '불참'
  | '조모임'
  | '장소 추가';

/** Request location type (from LOCATION_LIST) */
export type RequestLocation = string; // or you can define a union type if needed

export interface RequestProps {
  category: RequestCategory;
  title?: string;
  location: RequestLocation;
  writer: string;
  content: string;
  rest?: RestProps; // optional
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * 도메인 엔티티: Request
 * - DB나 Mongoose 의존 없이, 순수 비즈니스 로직 + 상태
 */
export class Request {
  private category: RequestCategory;
  private title?: string;
  private location: RequestLocation;
  private writer: string;
  private content: string;
  private rest?: Rest; // domain sub-entity
  private createdAt?: Date;
  private updatedAt?: Date;

  constructor(props: RequestProps) {
    if (!props.category) throw new Error('category is required');
    if (!props.location) throw new Error('location is required');
    if (!props.writer) throw new Error('writer is required');
    if (!props.content) throw new Error('content is required');

    this.category = props.category;
    this.title = props.title ?? undefined;
    this.location = props.location;
    this.writer = props.writer;
    this.content = props.content;
    this.rest = props.rest ? new Rest(props.rest) : undefined;
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }

  // Getter methods
  getCategory(): RequestCategory {
    return this.category;
  }
  getTitle(): string | undefined {
    return this.title;
  }
  getLocation(): RequestLocation {
    return this.location;
  }
  getWriter(): string {
    return this.writer;
  }
  getContent(): string {
    return this.content;
  }
  getRest(): Rest | undefined {
    return this.rest;
  }
  getCreatedAt(): Date | undefined {
    return this.createdAt;
  }
  getUpdatedAt(): Date | undefined {
    return this.updatedAt;
  }

  // Example domain logic
  updateContent(newContent: string): void {
    if (!newContent.trim()) {
      throw new Error('content cannot be empty');
    }
    this.content = newContent;
    this.updatedAt = new Date();
  }

  toPrimitives(): {
    category: RequestCategory;
    title?: string;
    location: RequestLocation;
    writer: string;
    content: string;
    rest?: { type: string; start: string; end: string };
    createdAt?: Date;
    updatedAt?: Date;
  } {
    return {
      category: this.category,
      title: this.title,
      location: this.location,
      writer: this.writer,
      content: this.content,
      rest: this.rest
        ? {
            type: this.rest.getType(),
            start: this.rest.getStart().toISOString(),
            end: this.rest.getEnd().toISOString(),
          }
        : undefined,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
