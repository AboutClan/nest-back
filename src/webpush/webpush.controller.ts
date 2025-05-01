import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { createSubDTO } from './webpush.dto';
import { WebPushService } from './webpush.service';

@ApiTags('webpush')
@Controller('webpush')
export class WebPushController {
  constructor(private readonly webPushService: WebPushService) {}

  @Post('subscribe')
  async subscribe(
    @Body('subscription') subscription: createSubDTO,
    @Req() req: Request,
  ): Promise<string> {
    await this.webPushService.subscribe(
      subscription,
      req.decodedToken.uid,
      req.decodedToken.id,
    );
    return 'register success';
  }

  @Post('sendNotification')
  async sendNotification(
    @Body('title') title: string,
    @Body('description') description: string,
  ): Promise<string> {
    await this.webPushService.sendNotificationAllUser(title, description);
    return 'Notification sent';
  }

  @Get('notification/:uid')
  sendNotificationToX(@Param() param: { uid: string }): string {
    const { uid } = param;
    console.log(34, uid);
    this.webPushService.sendNotificationToX(uid);
    return 'Notification sent';
  }

  @Post('notification/:id')
  async sendNotificationToXWithId(
    @Param() param: { id: string },
    @Body('title') title: string,
    @Body('description') description: string,
  ) {
    const { id } = param;
    await this.webPushService.sendNotificationToXWithId(id, title, description);
    return 'Notification sent';
  }
}
