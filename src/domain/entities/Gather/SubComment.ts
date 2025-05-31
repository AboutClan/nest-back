// src/domain/entities/gather/SubComment.ts

export interface SubCommentProps {
  id?: string;
  user: string; // DB에선 ObjectId, domain에선 string
  comment: string;
  likeList?: string[];
  createdAt?: string;
}

export class SubComment {
  public _id: string;
  public user: string;
  public comment: string;
  public likeList: string[];
  public createdAt: string;

  constructor(props: SubCommentProps) {
    this._id = props.id || '';
    this.user = props.user;
    this.comment = props.comment;
    this.likeList = props.likeList ?? [];
    this.createdAt = props.createdAt || '';
  }

  addLike(userId: string): boolean {
    if (!this.likeList.includes(userId)) {
      this.likeList.push(userId);
      return true;
    }
    return false;
  }

  removeLike(userId: string): boolean {
    const idx = this.likeList.indexOf(userId);
    if (idx !== -1) {
      this.likeList.splice(idx, 1);
      return true;
    }
    return false;
  }

  toPrimitives(): SubCommentProps {
    return {
      id: this._id,
      user: this.user,
      comment: this.comment,
      likeList: [...this.likeList],
    };
  }
}
