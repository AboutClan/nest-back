// src/domain/entities/groupStudy/SubComment.ts

export interface SubCommentProps {
  userId: string; // DB에서 user: ObjectId
  comment: string;
  likeList?: string[];
}

export class SubComment {
  private userId: string;
  private comment: string;
  private likeList: string[];

  constructor(props: SubCommentProps) {
    if (!props.userId) {
      throw new Error('SubComment userId is required');
    }
    if (!props.comment) {
      throw new Error('SubComment comment is required');
    }
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

  addLike(userId: string): boolean {
    if (!this.likeList.includes(userId)) {
      this.likeList.push(userId);
      return true;
    }
    return false;
  }

  removeLike(userId: string): boolean {
    const index = this.likeList.indexOf(userId);
    if (index !== -1) {
      this.likeList.splice(index, 1);
      return true;
    }
    return false;
  }

  toPrimitives(): SubCommentProps {
    return {
      userId: this.userId,
      comment: this.comment,
      likeList: [...this.likeList],
    };
  }
}
