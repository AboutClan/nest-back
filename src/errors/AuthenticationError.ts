import { AppError } from "./AppError";

export class AuthenticationError extends AppError {
  constructor(message: string, statusCode: number) {
    super(message, 401);
  }
}
