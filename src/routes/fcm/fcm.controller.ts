import {
  Controller,
  Post,
  Get,
  Body,
  Delete,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FcmService } from './fcm.service';

@ApiTags('fcm')
@Controller('fcm')
export class FcmController {
  constructor(private readonly fcmService: FcmService) {}

  @Get('test')
  async test() {
    try {
      await this.fcmService.sendNotificationToX('2283035576', 'hello', 'hello');
      return { message: 'Notification sent' };
    } catch (err) {
      throw new HttpException(
        'Error sending test notification',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('send-notification')
  async sendNotification(
    @Body('token') token: string,
    @Body('message') message: string,
  ) {
    try {
      await this.fcmService.sendNotification(token, message);
      return { status: 'success' };
    } catch (err) {
      throw new HttpException(
        'Error sending notification',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('token')
  async registerToken(
    @Body('uid') uid: string,
    @Body('fcmToken') fcmToken: string,
    @Body('platform') platform: string,
  ) {
    try {
      const registered = await this.fcmService.registerToken(
        uid,
        fcmToken,
        platform,
      );
      return registered;
    } catch (err) {
      throw new HttpException(
        'Error registering token',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('token')
  async deleteToken(
    @Body('uid') uid: string,
    @Body('platform') platform: string,
  ) {
    try {
      const deleted = await this.fcmService.deleteToken(uid, platform);
      return deleted;
    } catch (err) {
      throw new HttpException(
        'Error deleting token',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
