import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class UrlTransformInterceptor implements NestInterceptor {
  private readonly OLD_URL_PREFIX =
    'https://studyabout.s3.ap-northeast-2.amazonaws.com';
  private readonly NEW_URL_PREFIX = 'https://d15r8f9iey54a4.cloudfront.net';

  intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Observable<any> | Promise<Observable<any>> {
    return next.handle().pipe(map((data) => this.transformUrls(data)));
  }

  private transformUrls(data: any): any {
    if (data === null || data === undefined) {
      return data;
    }

    // 순환 참조 방지를 위한 WeakSet
    const visited = new WeakSet();

    const transform = (obj: any): any => {
      // null, undefined 체크
      if (obj === null || obj === undefined) {
        return obj;
      }

      // 원시 타입 처리
      if (typeof obj === 'string') {
        if (obj.startsWith(this.OLD_URL_PREFIX)) {
          return obj.replace(this.OLD_URL_PREFIX, this.NEW_URL_PREFIX);
        }
        return obj;
      }

      if (typeof obj !== 'object') {
        return obj;
      }

      // Date 객체 처리 (그대로 반환)
      if (obj instanceof Date) {
        return obj;
      }

      // Mongoose ObjectId 처리
      if (this.isObjectId(obj)) {
        return obj.toString();
      }

      // Mongoose 문서 객체 처리
      if (obj && typeof obj.toObject === 'function') {
        // Mongoose 문서를 일반 객체로 변환
        const plainObj = obj.toObject();
        return transform(plainObj);
      }

      // 배열 처리 (배열은 객체이므로 먼저 체크)
      if (Array.isArray(obj)) {
        // 빈 배열도 그대로 반환
        if (obj.length === 0) {
          return obj;
        }
        return obj.map((item) => {
          // 각 아이템을 재귀적으로 변환
          return transform(item);
        });
      }

      // 객체 처리 (순환 참조 방지)
      if (visited.has(obj)) {
        return obj; // 이미 처리한 객체는 그대로 반환
      }

      visited.add(obj);

      // 빈 객체 처리
      const keys = Object.keys(obj);
      if (keys.length === 0) {
        return {};
      }

      const result: any = {};
      for (const key in obj) {
        // Mongoose 내부 속성 제외
        if (
          Object.prototype.hasOwnProperty.call(obj, key) &&
          !key.startsWith('$__') &&
          key !== '__v'
        ) {
          let value = obj[key];

          // null, undefined는 그대로 유지
          if (value === null || value === undefined) {
            result[key] = value;
            continue;
          }

          // Date 객체는 그대로 유지
          if (value instanceof Date) {
            result[key] = value;
            continue;
          }

          // ObjectId 필드 처리 (_id 등)
          if (this.isObjectId(value)) {
            value = value.toString();
          }

          result[key] = transform(value);
        }
      }

      return result;
    };

    return transform(data);
  }

  /**
   * Mongoose ObjectId인지 확인
   */
  private isObjectId(obj: any): boolean {
    if (!obj || typeof obj !== 'object') {
      return false;
    }
    // Mongoose ObjectId의 특징들
    const constructorName = obj.constructor?.name;
    return (
      obj._bsontype === 'ObjectID' ||
      obj._bsontype === 'ObjectId' ||
      constructorName === 'ObjectID' ||
      constructorName === 'ObjectId' ||
      (typeof obj.toString === 'function' &&
        typeof obj.toHexString === 'function' &&
        obj.constructor?.name?.includes('ObjectId'))
    );
  }
}
