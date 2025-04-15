export interface LocationProps {
  main: string;
  sub?: string;
}

export class Location {
  private main: string;
  private sub: string;

  constructor(props: LocationProps) {
    this.main = props.main;
    this.sub = props.sub ?? '';
  }

  getMain(): string {
    return this.main;
  }

  getSub(): string {
    return this.sub;
  }

  toPrimitives(): LocationProps {
    return {
      main: this.main,
      sub: this.sub,
    };
  }
}
