import { SquareComment } from './SquareComment';
import { SquarePoll } from './SquarePoll';
import { SquareSubComment } from './SquareSubComment';

export interface SquareProps {
  _id?: string;
  category: string;
  title: string;
  content: string;
  type: string;
  poll?: {
    pollItems: Array<{
      _id?: string;
      name: string;
      users: any[];
    }>;
    canMultiple: boolean;
  };
  images: string[];
  author: any;
  viewers: any[];
  like: any[];
  comments: Array<{
    _id?: string;
    user: any;
    comment: string;
    subComments: Array<{
      user: any;
      comment: string;
      likeList: string[];
    }>;
    likeList: string[];
  }>;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Square {
  _id?: string;
  category: string;
  title: string;
  content: string;
  type: string;
  poll?: SquarePoll;
  images: string[];
  author: string;
  viewers: string[];
  like: string[];
  comments: SquareComment[];
  createdAt?: Date;
  updatedAt?: Date;

  constructor(props: SquareProps) {
    this._id = props._id;
    this.category = props.category;
    this.title = props.title;
    this.content = props.content;
    this.type = props.type;
    this.poll = props.poll ? new SquarePoll(props.poll) : undefined;
    this.images = props.images || [];
    this.author = props.author;
    this.viewers = props.viewers || [];
    this.like = props.like || [];
    this.comments =
      props.comments?.map((comment) => new SquareComment(comment)) || [];
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  addComment(comment: SquareComment) {
    this.comments.push(comment);
  }

  addSubComment(commentId: string, subComment: SquareSubComment) {
    const comment = this.comments.find((c) => c._id === commentId);
    if (comment) {
      comment.addSubComment(subComment);
    }
  }

  updateSubComment(commentId: string, subCommentId: string, comment: string) {
    const commentObj = this.comments.find((c) => c._id === commentId);
    if (!commentObj) {
      throw new Error(`Comment with id ${commentId} not found`);
    }

    const subComment = commentObj.subComments.find(
      (sc) => sc._id === subCommentId,
    );
    if (!subComment) {
      throw new Error(`SubComment with id ${subCommentId} not found`);
    }
    subComment.updateComment(comment);
  }

  removeSubComment(commentId: string, subCommentId: string) {
    const comment = this.comments.find((c) => c._id === commentId);
    if (comment) {
      comment.removeSubComment(subCommentId);
    }
  }

  removeComment(commentId: string) {
    this.comments = this.comments.filter(
      (comment) => comment._id !== commentId,
    );
  }

  addLike(userId: string) {
    if (!this.like.includes(userId)) {
      this.like.push(userId);
    }
  }

  addCommentLike(commentId: string, userId: string) {
    const comment = this.comments.find((c) => c._id === commentId);
    if (comment) {
      comment.addLike(userId);
    }
  }
  removeCommentLike(commentId: string, userId: string) {
    const comment = this.comments.find((c) => c._id === commentId);
    if (comment) {
      comment.removeLike(userId);
    }
  }

  addSubCommentLike(commentId: string, subCommentId: string, userId: string) {
    const comment = this.comments.find((c) => c._id === commentId);
    if (comment) {
      const subComment = comment.subComments.find(
        (sc) => sc._id === subCommentId,
      );
      if (subComment) {
        subComment.addLike(userId.toString());
      }
    }
  }

  removeSubCommentLike(
    commentId: string,
    subCommentId: string,
    userId: string,
  ) {
    const comment = this.comments.find((c) => c._id === commentId);
    if (comment) {
      const subComment = comment.subComments.find(
        (sc) => sc._id === subCommentId,
      );
      if (subComment) {
        subComment.removeLike(userId.toString());
      }
    }
  }

  patchPoll(userId: string, pollItems: string[]) {
    if (!this.poll) {
      throw new Error('Poll not found');
    }

    this.poll.pollItems.forEach((item) => {
      item.removeUser(userId.toString());
    });

    pollItems.forEach((itemId) => {
      const item = this.poll.pollItems.find(
        (pollItem) => pollItem._id === itemId,
      );
      if (!item) {
        throw new Error(`Poll item with id ${itemId} not found`);
      }
      if (!item.users.includes(userId.toString())) {
        this.poll.addUserToPollItem(itemId, userId.toString());
      }
    });
  }

  removeLike(userId: string) {
    this.like = this.like.filter((id) => id.toString() !== userId.toString());
  }

  addViewer(userId: string) {
    if (!this.viewers.includes(userId.toString())) {
      this.viewers.push(userId.toString());
    }
  }

  addImage(imageUrl: string) {
    this.images.push(imageUrl);
  }

  removeImage(imageUrl: string) {
    this.images = this.images.filter((img) => img !== imageUrl);
  }

  updateContent(title: string, content: string) {
    this.title = title;
    this.content = content;
  }

  updateCategory(category: string) {
    this.category = category;
  }

  updateType(type: string) {
    this.type = type;
  }

  setPoll(poll: SquarePoll) {
    this.poll = poll;
  }

  removePoll() {
    this.poll = undefined;
  }

  toPrimitives(): SquareProps {
    return {
      _id: this._id,
      category: this.category,
      title: this.title,
      content: this.content,
      type: this.type,
      poll: this.poll?.toPrimitives(),
      images: this.images,
      author: this.author,
      viewers: this.viewers,
      like: this.like,
      comments: this.comments.map((comment) => comment.toPrimitives()),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
