// src/domain/entities/realtime/Comment.ts

export interface CommentProps {
  text: string;
}

export class Comment {
  private text: string;

  constructor(props: CommentProps) {
    this.text = props.text;
  }

  getText(): string {
    return this.text;
  }

  toPrimitives(): CommentProps {
    return {
      text: this.text,
    };
  }
}
