import { VO_User } from 'src/domain/valueObject/VO_User';

export interface ContentProps {
  userId: string;
  content: string;
  createdAt?: Date;
}

export class Content {
  public userId: VO_User;
  public content: string;
  public createdAt: Date;

  constructor(props: ContentProps) {
    this.userId = new VO_User(props.userId);
    this.content = props.content;
    this.createdAt = props.createdAt ?? new Date(); // createdAt 기본값 추가
  }

  toPrimitives(): ContentProps {
    return {
      userId: this.userId.toString(),
      content: this.content,
      createdAt: this.createdAt,
    };
  }
}
