export interface SubCommentProps {
  userId: string; // DB에서 user -> ObjectId, 도메인에서는 string
  comment: string;
  likeList?: string[];
}

export class SubComment {
  private userId: string;
  private comment: string;
  private likeList: string[];

  constructor(props: SubCommentProps) {
    if (!props.userId) throw new Error('userId is required');
    if (!props.comment) throw new Error('comment is required');
    this.userId = props.userId;
    this.comment = props.comment;
    this.likeList = props.likeList ?? [];
  }

  getUserId(): string {
    return this.userId;
  }
  getComment(): string {
    return this.comment;
  }
  getLikeList(): string[] {
    return this.likeList;
  }

  addLike(userId: string): void {
    if (!this.likeList.includes(userId)) {
      this.likeList.push(userId);
    }
  }

  toPrimitives(): SubCommentProps {
    return {
      userId: this.userId,
      comment: this.comment,
      likeList: [...this.likeList],
    };
  }
}
