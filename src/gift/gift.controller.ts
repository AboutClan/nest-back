import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { SetGiftDto } from './dto';
import { IGIFT_SERVICE } from 'src/utils/di.tokens';
import { IGiftService } from './giftService.interface';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('gift')
@Controller('gift')
export class GiftController {
  constructor(@Inject(IGIFT_SERVICE) private giftService: IGiftService) {}

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
