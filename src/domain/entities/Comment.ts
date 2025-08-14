import { ENTITY } from 'src/Constants/ENTITY';

export interface CommentProps {
  _id?: string;
  postId: string;
  parentId?: string;
  postType: (typeof ENTITY.COMMENT.ENUM_POST_TYPE)[number];
  user: string;
  comment: string;
  likeList?: string[];
  createdAt?: Date;
}

export class Comment {
  public _id?: string;
  public postId: string;
  public parentId?: string;
  public postType: (typeof ENTITY.COMMENT.ENUM_POST_TYPE)[number];
  public user: string;
  public comment: string;
  public likeList?: string[];
  public createdAt?: Date;

  constructor(props: CommentProps) {
    this._id = props._id;
    this.postId = props.postId;
    this.parentId = props.parentId;
    this.postType = props.postType;
    this.user = props.user;
    this.comment = props.comment;
    this.likeList = props.likeList;
    this.createdAt = props.createdAt;
  }

  toSummary(): Partial<CommentProps> {
    return {
      _id: this._id,
      user: this.user,
      comment: this.comment,
      likeList: this.likeList,
      createdAt: this.createdAt,
    };
  }

  toPrimitives(): CommentProps {
    return {
      _id: this._id,
      postId: this.postId,
      parentId: this.parentId,
      postType: this.postType,
      user: this.user,
      comment: this.comment,
      likeList: this.likeList,
      createdAt: this.createdAt,
    };
  }
}
