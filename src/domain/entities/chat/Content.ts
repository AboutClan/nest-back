export interface ContentProps {
  userId: string;
  content: string;
  createdAt?: Date;
}

export class Content {
  public userId: string;
  public content: string;
  public createdAt: Date;

  constructor(props: ContentProps) {
    this.userId = props.userId;
    this.content = props.content;
    this.createdAt = props.createdAt ?? new Date(); // createdAt 기본값 추가
  }

  toPrimitives(): ContentProps {
    return {
      userId: this.userId,
      content: this.content,
      createdAt: this.createdAt,
    };
  }
}
