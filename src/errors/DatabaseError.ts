import { AppError } from "./AppError";

export class DatabaseError extends AppError {
  constructor(message: string = "Database error occurred") {
    super(message, 500); // 기본적으로 500 상태 코드 사용
  }
}
