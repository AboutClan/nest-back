export interface VoteCommentProps {
  comment: string;
}

export class VoteComment {
  comment: string;

  constructor(props: VoteCommentProps) {
    this.comment = props.comment;
  }

  toPrimitives(): VoteCommentProps {
    return {
      comment: this.comment,
    };
  }
}
