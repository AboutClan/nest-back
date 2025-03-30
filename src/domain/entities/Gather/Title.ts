export interface TitleProps {
  title: string;
  subtitle?: string | null;
}

export class Title {
  private title: string;
  private subtitle: string | null;

  constructor(props: TitleProps) {
    if (!props.title) {
      throw new Error('Title is required');
    }
    this.title = props.title;
    this.subtitle = props.subtitle ?? null;
  }

  getTitle(): string {
    return this.title;
  }

  getSubtitle(): string | null {
    return this.subtitle;
  }

  toPrimitives(): TitleProps {
    return {
      title: this.title,
      subtitle: this.subtitle,
    };
  }
}
