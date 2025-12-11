import {
  CallHandler,
  ExecutionContext,
  Inject,
  NestInterceptor,
} from '@nestjs/common';
import Redis from 'ioredis';
import { Observable } from 'rxjs';
import { GROUPSTUDY_FULL_DATA, REDIS_CLIENT } from 'src/redis/keys';

export class GroupStudyInterceptor implements NestInterceptor {
  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redisClient: Redis,
  ) {}
  intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Observable<any> | Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();

    if (request.url.startsWith('/groupStudy') && request.method !== 'GET') {
      this.redisClient.del(GROUPSTUDY_FULL_DATA);
    }
    return next.handle().pipe();
  }
}
