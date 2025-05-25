// src/domain/entities/SubComment.ts

export interface SubCommentProps {
  id?: string;
  user: string; // 실제 DB에서 user: ObjectId 인 경우 → domain에서는 string
  comment: string;
  likeList?: string[];
}

export class SubComment {
  public _id: string;
  public user: string;
  public comment: string;
  public likeList: string[];

  constructor(props: SubCommentProps) {
    this._id = props.id || '';
    this.user = props.user;
    this.comment = props.comment;
    this.likeList = props.likeList ?? [];
  }

  public addLike(userId: string): boolean {
    if (!this.likeList.includes(userId)) {
      this.likeList.push(userId);
      return true;
    }
    return false;
  }

  public removeLike(userId: string): boolean {
    const idx = this.likeList.indexOf(userId);
    if (idx !== -1) {
      this.likeList.splice(idx, 1);
      return true;
    }
    return false;
  }

  public toPrimitives(): SubCommentProps {
    return {
      id: this._id,
      user: this.user,
      comment: this.comment,
      likeList: [...this.likeList],
    };
  }
}
