import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { decode } from 'next-auth/jwt';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest();

    // 특정 경로에 대해 가드 제외
    const isPublic = this.reflector.get<boolean>(
      'isPublic',
      context.getHandler(),
    );

    if (isPublic) {
      return true; // 해당 경로는 가드를 적용하지 않음
    }

    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid authorization header');
    }

    const token = authHeader.split(' ')[1];
    if (!token || token.trim() === '') {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const secret = 'klajsdflksjdflkdvdssdq231e1w';
      const decodedToken = await decode({ token, secret });

      if (!decodedToken) {
        throw new UnauthorizedException('Invalid token');
      }

      (request as any).decodedToken = decodedToken;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Error decoding token');
    }
  }
}
