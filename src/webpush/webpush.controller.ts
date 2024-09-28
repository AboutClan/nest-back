import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { WebPushService } from './webpush.service';

@Controller('webpush')
export class WebPushController {
  constructor(private webPushService: WebPushService) {}

  @Post('subscribe')
  subscribe(@Body('subscription') subscription: string): string {
    this.webPushService.subscribe(subscription);
    return 'register success';
  }
  @Post('sendNotification')
  sendNotification(): string {
    this.webPushService.sendNotificationAllUser();
    return 'Notification sent';
  }
  @Get('notification/:uid')
  sendNotificationToX(@Param() param: any): string {
    const { uid } = param;
    this.webPushService.sendNotificationToX(uid);
    return param;
  }
}
