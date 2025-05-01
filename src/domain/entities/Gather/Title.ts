export interface TitleProps {
  title: string;
  subtitle?: string | null;
}

export class Title {
  public title: string;
  public subtitle: string | null;

  constructor(props: TitleProps) {
    this.title = props.title;
    this.subtitle = props.subtitle ?? null;
  }

  toPrimitives(): TitleProps {
    return {
      title: this.title,
      subtitle: this.subtitle,
    };
  }
}
