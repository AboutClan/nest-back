export interface CommentProps {
  text: string;
}

export class Comment {
  public readonly text: string;

  constructor(text: string) {
    if (!text) throw new Error('Comment.text is required');
    this.text = text;
  }

  toPrimitives(): CommentProps {
    return { text: this.text };
  }
}
