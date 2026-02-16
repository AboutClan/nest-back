import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { PrizeService } from '../services/prize.service';

@Controller('prize')
export class PrizeController {
  constructor(private readonly prizeService: PrizeService) { }

  @Get('')
  async getPrizes(
    @Query('cursor') cursor: string,
    @Query('category') category: string,
  ) {
    // This method can be used to fetch available prizes or any other prize-related data
    return this.prizeService.getPrizeList(category, cursor);
  }

  @Post('randomRoulette')
  async addRandomRoulette(@Body('userId') userId: string, @Body('gift') gift: string) {
    return this.prizeService.addRandomRoulette(userId, gift);
  }
}
