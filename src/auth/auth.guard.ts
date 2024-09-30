import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { decode } from 'next-auth/jwt';

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.split(' ')[1];

    if (!token || token === 'undefined') {
      throw new UnauthorizedException('No token provided');
    }

    const decodedToken = await decode({
      token,
      secret: 'klajsdflksjdflkdvdssdq231e1w', // 환경 변수로 관리하는 것이 좋습니다.
    });

    if (!decodedToken) {
      throw new UnauthorizedException('Invalid token');
    }

    // 요청 객체에 디코딩된 토큰을 저장합니다.
    (request as any).decodedToken = decodedToken;
    return true;
  }
}
