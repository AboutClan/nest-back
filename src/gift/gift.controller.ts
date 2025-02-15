import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { SetGiftDto } from './dto';
import { ApiTags } from '@nestjs/swagger';
import { GiftService } from './gift.service';

@ApiTags('gift')
@Controller('gift')
export class GiftController {
  constructor(private readonly giftService: GiftService) {}

  @Post()
  async setGift(@Body() setGiftDto: SetGiftDto) {
    const { name, cnt, giftId } = setGiftDto;

    try {
      const user = await this.giftService.setGift(name, cnt, giftId);
      return { user };
    } catch (err) {
      throw new HttpException(
        'Error setting gift',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('all')
  async getAllGift() {
    try {
      const user = await this.giftService.getAllGift();
      return { user };
    } catch (err) {
      throw new HttpException(
        'Error fetching all gifts',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  async getGift(@Param('id') id: string) {
    try {
      const user = await this.giftService.getGift(parseInt(id));
      return { user };
    } catch (err) {
      throw new HttpException(
        'Error fetching gift',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
