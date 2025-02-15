import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable, tap } from 'rxjs';
import { RequestContext } from './request-context';

@Injectable()
export class AsyncContextInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Observable<any> | Promise<Observable<any>> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();

    return new Observable((subscriber) => {
      RequestContext.run({ request }, () => {
        next
          .handle()
          .pipe(
            tap({
              complete: () => subscriber.complete(),
              error: (err) => subscriber.error(err),
              next: (val) => subscriber.next(val),
            }),
          )
          .subscribe();
      });
    });
  }
}
