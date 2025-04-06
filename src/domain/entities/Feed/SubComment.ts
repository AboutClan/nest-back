// src/domain/entities/SubComment.ts

export interface SubCommentProps {
  id?: string;
  user: string; // 실제 DB에서 user: ObjectId 인 경우 → domain에서는 string
  comment: string;
  likeList?: string[];
}

export class SubComment {
  private _id: string;
  private _user: string;
  private _comment: string;
  private _likeList: string[];

  constructor(props: SubCommentProps) {
    if (!props.user) throw new Error('userId is required');
    if (!props.comment) throw new Error('comment is required');

    this._id = props.id;
    this._user = props.user;
    this._comment = props.comment;
    this._likeList = props.likeList ?? [];
  }

  public get id(): string {
    return this._id;
  }

  public get user(): string {
    return this._user;
  }

  public get comment(): string {
    return this._comment;
  }

  public get likeList(): string[] {
    return this._likeList;
  }

  public addLike(userId: string): boolean {
    if (!this._likeList.includes(userId)) {
      this._likeList.push(userId);
      return true;
    }
    return false;
  }

  public removeLike(userId: string): boolean {
    const idx = this._likeList.indexOf(userId);
    if (idx !== -1) {
      this._likeList.splice(idx, 1);
      return true;
    }
    return false;
  }

  public toPrimitives(): SubCommentProps {
    return {
      id: this._id,
      user: this._user,
      comment: this._comment,
      likeList: [...this._likeList],
    };
  }
}
