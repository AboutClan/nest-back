export interface InterestProps {
  first: string;
  second?: string | null;
}

export class Interest {
  private first: string;
  private second?: string | null;

  constructor(props: InterestProps) {
    if (!props.first) {
      throw new Error('first is required');
    }
    this.first = props.first;
    this.second = props.second ?? null;
  }

  getFirst(): string {
    return this.first;
  }
  getSecond(): string | null | undefined {
    return this.second;
  }

  toPrimitives(): InterestProps {
    return {
      first: this.first,
      second: this.second,
    };
  }
}
