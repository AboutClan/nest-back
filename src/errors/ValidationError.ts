import { AppError } from "./AppError";

export class ValidationError extends AppError {
  public readonly errors: string[];

  constructor(message: string = "Validation error", errors: string[] = []) {
    super(message, 400); // 기본적으로 400 상태 코드 사용
    this.errors = errors; // 추가적인 오류 정보를 포함할 수 있음
  }
}
