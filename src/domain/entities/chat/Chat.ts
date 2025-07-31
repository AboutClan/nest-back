import { VO_User } from 'src/domain/valueObject/VO_User';
import { Content, ContentProps } from './Content';

// 1) ChatStatus를 enum으로 정의
export enum ChatStatus {
  Normal = 'normal',
  Inactive = 'inactive',
  Deleted = 'deleted',
}

export interface ChatProps {
  id?: string;
  user1: string;
  user2: string;
  status?: ChatStatus;
  contents: ContentProps[];
}

export class Chat {
  public _id: string;
  public user1: VO_User;
  public user2: VO_User;
  public status: ChatStatus;
  public contents: Content[];

  constructor(props: ChatProps) {
    this._id = props.id ?? '';
    this.user1 = new VO_User(props.user1);
    this.user2 = new VO_User(props.user2);
    // 2) 기본값도 enum으로
    this.status = props.status ?? ChatStatus.Normal;
    this.contents = (props.contents ?? []).map((c) => new Content(c));
  }

  addContent(contentProps: ContentProps) {
    const content = new Content(contentProps);
    this.contents.push(content);
  }

  toPrimitives(): ChatProps {
    return {
      id: this._id,
      user1: this.user1.toString(),
      user2: this.user2.toString(),
      status: this.status, // enum 값 그대로 string으로 출력됩니다
      contents: this.contents.map((c) => c.toPrimitives()),
    };
  }
}
