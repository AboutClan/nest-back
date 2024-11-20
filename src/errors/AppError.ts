import { HttpException } from '@nestjs/common';

export class AppError extends HttpException {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message, statusCode);
    this.statusCode = statusCode;

    Error.captureStackTrace(this, this.constructor);
  }
}
