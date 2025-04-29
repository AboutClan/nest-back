export interface ContentProps {
  userId: string;
  content: string;
  createdAt?: Date;
}

export class Content {
  private props: Required<ContentProps>;

  constructor(props: ContentProps) {
    this.props = {
      userId: props.userId,
      content: props.content,
      createdAt: props?.createdAt,
    };
  }

  get userId(): string {
    return this.props.userId;
  }

  get content(): string {
    return this.props.content;
  }
  get createdAt(): Date {
    return this.props?.createdAt;
  }

  toPrimitives(): ContentProps {
    return {
      userId: this.props.userId,
      content: this.props.content,
      createdAt: this.props.createdAt,
    };
  }
}
