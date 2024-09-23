import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { strToDate } from './utils/strToDate'; // 날짜 변환 함수

@Injectable()
export class SetDateParamMiddleware implements NestMiddleware {
  async use(req: Request, res: Response, next: NextFunction) {
    const { date: dateStr } = req.params;

    const dayjsDate = strToDate(dateStr);
    const date = dayjsDate.toDate();

    if (!date) {
      return res.status(401).end(); // 날짜 변환이 실패했을 때
    }

    req['date'] = date; // request 객체에 date 추가
    next(); // 다음 미들웨어로 넘김
  }
}
