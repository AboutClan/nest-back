import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatContoller {
  constructor(private readonly chatService: ChatService) {}

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
