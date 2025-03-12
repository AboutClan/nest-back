import {
  Inject,
  Injectable,
  LoggerService,
  NestMiddleware,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: LoggerService,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();

    // 요청 로깅 (JSON 형식)
    this.logger.log({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Incoming Request',
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      body: req.body,
    });

    res.on('finish', () => {
      const duration = Date.now() - startTime;

      // 응답 로깅 (JSON 형식)
      this.logger.log({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Outgoing Response',
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration: `${duration}`,
      });
    });

    next();
  }
}
