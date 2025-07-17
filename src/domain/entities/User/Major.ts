export class Major {
  constructor(
    public department?: string,
    public detail?: string,
  ) {
    this.department = department || '';
    this.detail = detail || '';
  }

  toPrimitives() {
    return { department: this.department, detail: this.detail };
  }
}

export interface IMajor {
  department?: string;
  detail?: string;
}
