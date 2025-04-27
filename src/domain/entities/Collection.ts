import { IUser } from 'src/user/user.entity';

export interface CollectionPrimitives {
  id?: string;
  user: string | IUser;
  type?: 'alphabet';
  collects?: string[];
  collectCnt?: number;
  stamps?: number;
}

export class Collection {
  private _id?: string;
  private _user: string | IUser;
  private _type: 'alphabet';
  private _collects: string[];
  private _collectCnt: number;
  private _stamps: number;

  constructor({
    id,
    user,
    type = 'alphabet',
    collects = [],
    collectCnt = 0,
    stamps = 0,
  }: CollectionPrimitives) {
    this._id = id;
    this._user = user;
    this._type = type;
    this._collects = collects;
    this._collectCnt = collectCnt;
    this._stamps = stamps;
  }

  removeAlphabet(alphabet: string) {
    const idx = this._collects.indexOf(alphabet);
    if (idx !== -1) {
      this._collects.splice(idx, 1);
      this._collectCnt = this._collects.length;
    }
  }

  addAlphabet(alphabet: string) {
    this._collects.push(alphabet);
    this._collectCnt = this._collects.length;
  }

  increaseStamp() {
    this._stamps++;
  }

  // --- getters / setters ---
  get id(): string | undefined {
    return this._id;
  }

  get user(): string | IUser {
    return this._user;
  }

  get type(): 'alphabet' {
    return this._type;
  }

  get collects(): string[] {
    return [...this._collects];
  }

  get collectCnt(): number {
    return this._collectCnt;
  }

  get stamps(): number {
    return this._stamps;
  }

  set stamps(value: number) {
    this._stamps = value;
  }

  toPrimitives(): CollectionPrimitives {
    return {
      id: this._id,
      user: this._user,
      type: this._type,
      collects: [...this._collects],
      collectCnt: this._collectCnt,
      stamps: this._stamps,
    };
  }
}
