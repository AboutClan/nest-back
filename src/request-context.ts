import { Request } from 'express';
import { AsyncLocalStorage } from 'node:async_hooks';
import { decodedTokenType } from './types/express';

interface ContextStore {
  request: Request;
}

export class RequestContext {
  private static readonly als = new AsyncLocalStorage<ContextStore>();

  static run(store: ContextStore, callback: () => void) {
    return this.als.run(store, callback);
  }

  static getStore(): ContextStore | undefined {
    return this.als.getStore();
  }

  static getRequest(): Request | undefined {
    return this.als.getStore()?.request;
  }

  static getDecodedToken(): decodedTokenType | undefined {
    return this.als.getStore()?.request.decodedToken;
  }
}
