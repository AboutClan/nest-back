export interface MajorProps {
  department: string;
  detail: string;
}

export class Major {
  private department: string;
  private detail: string;

  constructor(props: MajorProps) {
    if (!props.department) {
      throw new Error('department is required');
    }
    if (!props.detail) {
      throw new Error('detail is required');
    }
    this.department = props.department;
    this.detail = props.detail;
  }

  getDepartment(): string {
    return this.department;
  }
  getDetail(): string {
    return this.detail;
  }

  toPrimitives(): MajorProps {
    return {
      department: this.department,
      detail: this.detail,
    };
  }
}
