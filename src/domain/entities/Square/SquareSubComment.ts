export interface SquareSubCommentProps {
  _id?: string;
  user: string;
  comment: string;
  likeList: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export class SquareSubComment {
  _id?: string;
  user: string;
  comment: string;
  likeList: string[];
  createdAt?: Date;
  updatedAt?: Date;

  constructor(props: SquareSubCommentProps) {
    this._id = props._id;
    this.user = props.user;
    this.comment = props.comment;
    this.likeList = props.likeList || [];
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  addLike(userId: string) {
    if (!this.likeList.includes(userId)) {
      this.likeList.push(userId);
    }
  }

  removeLike(userId: string) {
    this.likeList = this.likeList.filter((id) => id !== userId);
  }

  updateComment(comment: string) {
    this.comment = comment;
  }

  toPrimitives(): SquareSubCommentProps {
    return {
      _id: this._id,
      user: this.user,
      comment: this.comment,
      likeList: this.likeList,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
