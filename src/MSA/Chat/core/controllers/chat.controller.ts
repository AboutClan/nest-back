import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ChatService } from '../services/chat.service';
import { CreateChatDTO, GetChatDTO } from '../../dtos/dto';

//todo: user정보 populate 관련 수정
@ApiTags('chat')
@Controller('chat')
export class ChatContoller {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  async createChat(@Body() createChatDTO: CreateChatDTO) {
    const { toUid, message } = createChatDTO;

    await this.chatService.createChat(toUid, message);
    return { status: 'success' };
  }

  @Get()
  async getChat(@Query() getChatDTO: GetChatDTO) {
    const { toUid } = getChatDTO;
    return await this.chatService.getChat(toUid);
  }

  @Get('mine')
  async getChats() {
    return await this.chatService.getChats();
  }

  @Get('recent')
  async getRecentChat() {
    return await this.chatService.getRecentChat();
  }
}
