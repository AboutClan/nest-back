import { Injectable } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class RequestContext {
  private static request: Request;

  static setRequest(request: Request) {
    RequestContext.request = request;
  }

  static getRequest(): Request {
    return RequestContext.request;
  }
}
