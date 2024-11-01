import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ICHAT_SERVICE } from 'src/utils/di.tokens';
import { IChatService } from './chatService.interface';

//todo: user정보 populate 관련 수정
@Controller('chat')
export class ChatContoller {
  constructor(@Inject(ICHAT_SERVICE) private chatService: IChatService) {}

  @Post()
  async createChat(
    @Body('toUid') toUid: string,
    @Body('message') message: string,
    @Req() req: any,
  ) {
    const { decodedToken } = req;
    await this.chatService.createChat(toUid, message);
    return { status: 'success' };
  }

  @Get()
  async getChat(
    @Query('toUid') toUid: string,
    @Query('cursor') cursor: string,
  ) {
    const chatList = await this.chatService.getChat(toUid);
    return chatList;
  }

  @Get('mine')
  async getChats(@Query('cursor') cursor: string) {
    const chatList = await this.chatService.getChats();
    return chatList;
  }

  @Get('recent')
  async getRecentChat(@Query('cursor') cursor: string) {
    const chat = await this.chatService.getRecentChat();
    return chat;
  }
}
