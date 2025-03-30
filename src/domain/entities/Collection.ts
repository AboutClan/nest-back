import { IUser } from 'src/user/user.entity';

export interface CollectionProps {
  user: string | IUser;
  type: 'alphabet';
  collects: string[];
  collectCnt: number;
  stamps: number;
}

export class Collection {
  private props: CollectionProps;

  constructor(props: CollectionProps) {
    this.props = props;
  }

  get user(): string | IUser {
    return this.props.user;
  }
  get type(): 'alphabet' {
    return this.props.type;
  }
  get collects(): string[] {
    return this.props.collects;
  }
  get collectCnt(): number {
    return this.props.collectCnt;
  }
  get stamps(): number {
    return this.props.stamps;
  }
}
