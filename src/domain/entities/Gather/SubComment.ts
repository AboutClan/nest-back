// src/domain/entities/gather/SubComment.ts

export interface SubCommentProps {
  id?: string;
  user: string; // DB에선 ObjectId, domain에선 string
  comment: string;
  likeList?: string[];
}

export class SubComment {
  public id: string;
  public user: string;
  public comment: string;
  public likeList: string[];

  constructor(props: SubCommentProps) {
    this.id = props.id || '';
    this.user = props.user;
    this.comment = props.comment;
    this.likeList = props.likeList ?? [];
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
      id: this.id,
      user: this.user,
      comment: this.comment,
      likeList: [...this.likeList],
    };
  }
}
