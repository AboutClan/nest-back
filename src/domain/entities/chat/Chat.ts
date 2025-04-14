import { IUser } from 'src/user/user.entity';
import { Content, ContentProps } from './Content';

export type ChatStatus = 'normal' | 'inactive' | 'deleted';

export interface ChatProps {
  user1: string | IUser;
  user2: string | IUser;
  status?: ChatStatus;
  contents: ContentProps[];
}

export class Chat {
  private props: {
    user1: string | IUser;
    user2: string | IUser;
    status: ChatStatus;
    contents: Content[];
  };

  constructor(props: ChatProps) {
    this.props = {
      user1: props.user1,
      user2: props.user2,
      status: props.status ?? 'normal',
      contents: (props.contents ?? []).map((c) => new Content(c)),
    };
  }

  get user1(): IUser | string {
    return this.props.user1;
  }

  get user2(): IUser | string {
    return this.props.user2;
  }

  get status(): ChatStatus {
    return this.props.status;
  }

  get contents(): Content[] {
    return this.props.contents;
  }

  addContent(contentProps: ContentProps) {
    const content = new Content(contentProps);
    this.props.contents.push(content);
  }

  // 도메인 엔티티 -> DTO or primitive 변환
  toPrimitives(): ChatProps {
    return {
      user1: this.props.user1,
      user2: this.props.user2,
      status: this.props.status,
      contents: this.props.contents.map((c) => c.toPrimitives()),
    };
  }
}
