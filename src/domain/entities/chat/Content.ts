export interface ContentProps {
  userId: string;
  content: string;
}

export class Content {
  private props: Required<ContentProps>;

  constructor(props: ContentProps) {
    this.props = {
      userId: props.userId,
      content: props.content,
    };
  }

  get userId(): string {
    return this.props.userId;
  }

  get content(): string {
    return this.props.content;
  }

  toPrimitives(): ContentProps {
    return { ...this.props };
  }
}
