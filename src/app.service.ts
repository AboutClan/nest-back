import { Injectable } from '@nestjs/common';
import { NotificationScheduler } from './schedule/schedule';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }
}
