import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { createSubDTO } from './webpush.dto';
import { IWebPushService } from './webpushService.interface';
import { IWEBPUSH_SERVICE } from 'src/utils/di.tokens';
import { Request } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { AppError } from 'src/errors/AppError';

@ApiTags('webpush')
@Controller('webpush')
export class WebPushController {
  constructor(
    @Inject(IWEBPUSH_SERVICE) private webPushService: IWebPushService,
  ) {}

  @Post('subscribe')
  subscribe(
    @Body('subscription') subscription: createSubDTO,
    @Req() req: Request,
  ): string {
    this.webPushService.subscribe(
      subscription,
      req.decodedToken.uid,
      req.decodedToken.id,
    );
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
