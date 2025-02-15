import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { IWEBPUSH_SERVICE } from 'src/utils/di.tokens';
import { ApiTags } from '@nestjs/swagger';
import NoticeService from './notice.service';
import { WebPushService } from 'src/webpush/webpush.service';

//todo: Notice 전반적인 수정 필요해보임
@ApiTags('notice')
@Controller('notice')
export class NoticeController {
  constructor(
    private readonly noticeService: NoticeService,
    private readonly webPushService: WebPushService,
  ) {}

  @Get()
  async findActiveLog() {
    try {
      const result = await this.noticeService.findActiveLog();
      return result;
    } catch (err) {
      throw new HttpException(
        'Error fetching active log',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  //todo: 이름 무슨의미?
  @Get('score')
  async getActiveLog() {
    try {
      const result = await this.noticeService.getActiveLog();
      return result;
    } catch (err) {
      throw new HttpException(
        'Error fetching active log',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('like')
  async getLike() {
    try {
      const result = await this.noticeService.getLike();
      return result;
    } catch (err) {
      throw new HttpException(
        'Error fetching like log',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  //todo: 동일 유저 방어 로직 필요
  @Post('like')
  async setLike(@Body('to') to: string, @Body('message') message: string) {
    try {
      await this.noticeService.setLike(to, message);
      await this.webPushService.sendNotificationToX(
        to,
        '좋아요를 받았어요!',
        `님이 좋아요를 보냈어요!`,
      );
      // await this.fcmService.sendNotificationToX(
      //   to,
      //   '좋아요를 받았어요!',
      //   `님이 좋아요를 보냈어요!`,
      // );
      return { status: 'success' };
    } catch (err) {
      throw new HttpException(
        'Error setting like',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('like')
  async deleteLike(@Body('to') to: string) {
    try {
      await this.noticeService.deleteLike(to);
      return { status: 'success' };
    } catch (err) {
      throw new HttpException(
        'Error deleting like',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('like/all')
  async getLikeAll() {
    try {
      const result = await this.noticeService.getLikeAll();
      return result;
    } catch (err) {
      throw new HttpException(
        'Error fetching all likes',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('friend')
  async getFriendRequest() {
    try {
      const result = await this.noticeService.getFriendRequest();
      return result;
    } catch (err) {
      throw new HttpException(
        'Error fetching friend requests',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('friend')
  async requestFriendNotice(
    @Body('toUid') toUid: string,
    @Body('message') message: string,
  ) {
    try {
      await this.noticeService.requestNotice('friend', toUid, message);
      // await this.webPushService.sendNotificationToX(
      //   toUid,
      //   '친구 요청을 받았어요!',
      //   `님이 친구 요청을 보냈어요!`,
      // );
      // await this.fcmService.sendNotificationToX(
      //   toUid,
      //   '친구 요청을 받았어요!',
      //   `님이 친구 요청을 보냈어요!`,
      // );
      return { status: 'success' };
    } catch (err) {
      throw new HttpException(
        'Error sending friend request notice',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch('friend')
  async updateRequestFriend(
    @Body('from') from: string,
    @Body('status') status: string,
  ) {
    try {
      await this.noticeService.updateRequestFriend('friend', from, status);
      return { status: 'success' };
    } catch (err) {
      throw new HttpException(
        'Error updating friend request',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('alphabet')
  async requestAlphabetNotice(
    @Body('toUid') toUid: string,
    @Body('message') message: string,
    @Body('sub') sub: string,
  ) {
    try {
      await this.noticeService.requestNotice('alphabet', toUid, message, sub);
      return { status: 'success' };
    } catch (err) {
      throw new HttpException(
        'Error sending alphabet request notice',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch('alphabet')
  async updateRequestAlphabet(
    @Body('from') from: string,
    @Body('status') status: string,
  ) {
    try {
      await this.noticeService.updateRequestFriend('alphabet', from, status);
      return { status: 'success' };
    } catch (err) {
      throw new HttpException(
        'Error updating alphabet request',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
