import { IUser } from 'src/user/user.entity';

export interface CollectionProps {
  id?: string;
  user: string | IUser;
  type?: 'alphabet';
  collects?: string[];
  collectCnt?: number;
  stamps?: number;
}

export class Collection {
  private props: CollectionProps;

  constructor(props: CollectionProps) {
    this.props = {
      id: props.id,
      user: props.user,
      type: props.type || 'alphabet',
      collects: props.collects || [],
      collectCnt: props.collectCnt || 0,
      stamps: props.stamps || 0,
    };
  }

  removeAlphabet(alphabet: string) {
    const index = this.collects.indexOf(alphabet);
    if (index !== -1) {
      this.collects.splice(index, 1);
    }
  }

  addAlphabet(alphabet: string) {
    this.collects.push(alphabet);
  }
  increaseStamp() {
    this.props.stamps++;
  }

  get id(): string {
    return this.props.id;
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
  set stamps(stamps: number) {
    this.props.stamps = stamps;
  }

  toPrimitives() {
    return { ...this.props };
  }
}
