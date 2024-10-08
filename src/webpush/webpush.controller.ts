import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { WebPushService } from './webpush.service';
import { createSubDTO } from './webpush.dto';

@Controller('webpush')
export class WebPushController {
  constructor(private webPushService: WebPushService) {}

  @Post('subscribe')
  subscribe(@Body('subscription') subscription: createSubDTO): string {
    this.webPushService.subscribe(subscription);
    return 'register success';
  }
  @Post('sendNotification')
  sendNotification(): string {
    this.webPushService.sendNotificationAllUser();
    return 'Notification sent';
  }
  @Get('notification/:uid')
  sendNotificationToX(@Param() param: { uid: string }): string {
    const { uid } = param;
    this.webPushService.sendNotificationToX(uid);
    return 'Notification sent';
  }
}
