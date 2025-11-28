import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import NoticeService from './notice.service';

//todo: Notice 전반적인 수정 필요해보임.
@ApiTags('notice')
@Controller('notice')
export class NoticeController {
  constructor(private readonly noticeService: NoticeService) {}

  @Get()
  async findActiveLog() {
    const result = await this.noticeService.findActiveLog();
    return result;
  }

  //todo: 이름 무슨의미?
  @Get('score')
  async getActiveLog() {
    const result = await this.noticeService.getActiveLog();
    return result;
  }

  @Get('like')
  async getLike() {
    const result = await this.noticeService.getLike();
    return result;
  }

  //todo: 동일 유저 방어 로직 필요
  @Post('like')
  async setLike(@Body('to') to: string, @Body('message') message: string) {
    await this.noticeService.setLike(to, message);

    return { status: 'success' };
  }

  @Delete('like')
  async deleteLike(@Body('to') to: string) {
    await this.noticeService.deleteLike(to);
    return { status: 'success' };
  }

  @Get('like/all')
  async getLikeAll() {
    const result = await this.noticeService.getLikeAll();
    return result;
  }

  @Get('friend')
  async getFriendRequest() {
    const result = await this.noticeService.getFriendRequest();
    return result;
  }

  @Post('friend')
  async requestFriendNotice(
    @Body('toUid') toUid: string,
    @Body('message') message: string,
  ) {
    await this.noticeService.requestNotice('friend', toUid, message);
    return { status: 'success' };
  }

  @Patch('friend')
  async updateRequestFriend(
    @Body('from') from: string,
    @Body('status') status: string,
  ) {
    await this.noticeService.updateRequestFriend('friend', from, status);
    return { status: 'success' };
  }

  @Post('alphabet')
  async requestAlphabetNotice(
    @Body('toUid') toUid: string,
    @Body('message') message: string,
    @Body('sub') sub: string,
  ) {
    await this.noticeService.requestNotice('alphabet', toUid, message, sub);
    return { status: 'success' };
  }

  @Patch('alphabet')
  async updateRequestAlphabet(
    @Body('from') from: string,
    @Body('status') status: string,
  ) {
    await this.noticeService.updateRequestFriend('alphabet', from, status);
    return { status: 'success' };
  }

  @Get('temperature')
  async getTemperature() {
    const result = await this.noticeService.getTemperature();
    return result;
  }

  @Get('temperature/mine')
  async getMyTemperature(@Query('uid') uid) {
    const result = await this.noticeService.getMyTemperature(uid);
    return result;
  }

  @Get('temperature/all')
  async getAllTemperature(@Query('page') page = 1, @Query('page') userId) {
    const result = await this.noticeService.getAllTemperature(page, userId);
    return result;
  }

  @Post('temperature/gatherReview')
  async createTemperatureByGather(
    @Body('infos') infos: { toUid: string; message: string; rating: string }[],
    @Body('gatherId') gatherId: string,
  ) {
    await this.noticeService.createTemperature(infos, gatherId);
    return { status: 'success' };
  }
  @Post('temperature/studyReview')
  async createTemperatureByStudy(
    @Body('infos') infos: { toUid: string; message: string; rating: string }[],
    @Body('date') date: string,
    @Body('studyId') studyId: string,
  ) {
    console.log(44, studyId);
    await this.noticeService.createTemperatureByStudy(infos, date, studyId);
    return { status: 'success' };
  }
}
