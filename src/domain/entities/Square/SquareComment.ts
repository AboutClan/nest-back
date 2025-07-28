import { SquareSubComment } from './SquareSubComment';

export interface SquareCommentProps {
  _id?: string;
  user: string;
  comment: string;
  subComments: Array<{
    user: string;
    comment: string;
    likeList: string[];
  }>;
  likeList: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export class SquareComment {
  _id?: string;
  user: string;
  comment: string;
  subComments: SquareSubComment[];
  likeList: string[];
  createdAt?: Date;
  updatedAt?: Date;

  constructor(props: SquareCommentProps) {
    this._id = props._id;
    this.user = props.user;
    this.comment = props.comment;
    this.subComments =
      props.subComments?.map(
        (subComment) => new SquareSubComment(subComment),
      ) || [];
    this.likeList = props.likeList || [];
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  addSubComment(subComment: SquareSubComment) {
    this.subComments.push(subComment);
  }

  removeSubComment(subCommentId: string) {
    this.subComments = this.subComments.filter(
      (subComment) => subComment._id !== subCommentId,
    );
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

  toPrimitives(): SquareCommentProps {
    return {
      _id: this._id,
      user: this.user,
      comment: this.comment,
      subComments: this.subComments.map((subComment) =>
        subComment.toPrimitives(),
      ),
      likeList: this.likeList,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
