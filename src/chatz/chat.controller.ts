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
import { CreateChatDTO, GetChatDTO } from './dto';

//todo: user정보 populate 관련 수정
@Controller('chat')
export class ChatContoller {
  constructor(@Inject(ICHAT_SERVICE) private chatService: IChatService) {}

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
