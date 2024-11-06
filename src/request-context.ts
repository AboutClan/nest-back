import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { JWT } from 'next-auth/jwt';

@Injectable()
export class RequestContext {
  private static request: Request;

  static setRequest(request: Request) {
    RequestContext.request = request;
  }

  static getRequest(): Request {
    return RequestContext.request;
  }

  static getDecodedToken(): JWT {
    const decodedToken = RequestContext.getRequest()?.decodedToken;
    if (!decodedToken) return null;
    return decodedToken;
  }
}
