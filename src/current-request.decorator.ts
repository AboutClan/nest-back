import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { RequestContext } from './request-context';

export const CurrentRequest = createParamDecorator(
  (data: unknown, context: ExecutionContext): Request => {
    return RequestContext.getRequest();
  },
);
