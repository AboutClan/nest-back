import { IUser } from 'src/MSA/User/entity/user.entity';

export interface CollectionPrimitives {
  id?: string;
  user: string | IUser;
  type?: 'alphabet';
  collects?: string[];
  collectCnt?: number;
  stamps?: number;
}

export class Collection {
  public id?: string;
  public user: string | IUser;
  public type: 'alphabet';
  public collects: string[];
  public collectCnt: number;
  public stamps: number;

  constructor({
    id,
    user,
    type = 'alphabet',
    collects = [],
    collectCnt = 0,
    stamps = 0,
  }: CollectionPrimitives) {
    this.id = id;
    this.user = user;
    this.type = type;
    this.collects = collects;
    this.collectCnt = collectCnt;
    this.stamps = stamps;
  }

  removeAlphabet(alphabet: string) {
    const idx = this.collects.indexOf(alphabet);
    if (idx !== -1) {
      this.collects.splice(idx, 1);
      this.collectCnt = this.collects.length;
    }
  }

  addAlphabet(alphabet: string) {
    this.collects.push(alphabet);
    this.collectCnt = this.collects.length;
  }

  increaseStamp() {
    this.stamps++;
  }

  toPrimitives(): CollectionPrimitives {
    return {
      id: this.id,
      user: this.user,
      type: this.type,
      collects: [...this.collects],
      collectCnt: this.collectCnt,
      stamps: this.stamps,
    };
  }
}
