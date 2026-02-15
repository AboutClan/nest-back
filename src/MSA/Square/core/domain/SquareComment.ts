export interface SquareCommentProps {
  _id?: string;
  postId: string;
  parentId?: string;
  user: string;
  comment: string;
  likeList?: string[];
  createdAt?: Date;
}

export class SquareComment {
  public _id?: string;
  public postId: string;
  public parentId?: string;
  public user: string;
  public comment: string;
  public likeList?: string[];
  public createdAt?: Date;

  constructor(props: SquareCommentProps) {
    this._id = props._id;
    this.postId = props.postId;
    this.parentId = props.parentId;
    this.user = props.user;
    this.comment = props.comment;
    this.likeList = props.likeList;
    this.createdAt = props.createdAt;
  }

  toggleLike(userId: string): void {
    if (this.likeList.includes(userId.toString())) {
      this.likeList = this.likeList.filter(
        (id) => id.toString() !== userId.toString(),
      );
    } else {
      this.likeList.push(userId.toString());
    }
  }

  toSummary(): Partial<SquareCommentProps> {
    return {
      _id: this._id,
      user: this.user,
      comment: this.comment,
      likeList: this.likeList,
      createdAt: this.createdAt,
    };
  }

  toPrimitives(): SquareCommentProps {
    return {
      _id: this._id,
      postId: this.postId,
      parentId: this.parentId,
      user: this.user,
      comment: this.comment,
      likeList: this.likeList,
      createdAt: this.createdAt,
    };
  }
}
