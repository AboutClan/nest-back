// src/domain/entities/groupStudy/Category.ts

export interface CategoryProps {
  main: string;
  sub: string;
}

export class Category {
  private main: string;
  private sub: string;

  constructor(props: CategoryProps) {
    if (!props.main) {
      throw new Error('Category main is required.');
    }
    this.main = props.main;
    this.sub = props.sub;
  }

  getMain(): string {
    return this.main;
  }

  getSub(): string {
    return this.sub;
  }

  toPrimitives(): CategoryProps {
    return {
      main: this.main,
      sub: this.sub,
    };
  }
}
