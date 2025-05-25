import { IUser } from 'src/routes/user/user.entity';
import { Content, ContentProps } from './Content';

export type ChatStatus = 'normal' | 'inactive' | 'deleted';

export interface ChatProps {
  id?: string;
  user1: string | IUser;
  user2: string | IUser;
  status?: ChatStatus;
  contents: ContentProps[];
}

export class Chat {
  public _id: string;
  public user1: string | IUser;
  public user2: string | IUser;
  public status: ChatStatus;
  public contents: Content[];

  constructor(props: ChatProps) {
    this._id = props.id ?? '';
    this.user1 = props.user1;
    this.user2 = props.user2;
    this.status = props.status ?? 'normal';
    this.contents = (props.contents ?? []).map((c) => new Content(c));
  }

  addContent(contentProps: ContentProps) {
    const content = new Content(contentProps);
    this.contents.push(content);
  }

  toPrimitives(): ChatProps {
    return {
      id: this._id,
      user1: this.user1,
      user2: this.user2,
      status: this.status,
      contents: this.contents.map((c) => c.toPrimitives()),
    };
  }
}
