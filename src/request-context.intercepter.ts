// import {
//   CallHandler,
//   ExecutionContext,
//   Injectable,
//   NestInterceptor,
// } from '@nestjs/common';
// import { Observable, tap } from 'rxjs';
// import { RequestContext } from './request-context';
// import { Request } from 'express';

// @Injectable()
// export class RequestContextInterceptor implements NestInterceptor {
//   intercept(
//     context: ExecutionContext,
//     next: CallHandler<any>,
//   ): Observable<any> | Promise<Observable<any>> {
//     const request: Request = context.switchToHttp().getRequest();

//     RequestContext.setRequest(request);
//     return next.handle().pipe(tap(() => {}));
//   }
// }
