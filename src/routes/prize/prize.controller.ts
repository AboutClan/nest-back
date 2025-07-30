import { Controller, Get, Query } from '@nestjs/common';
import { PrizeService } from './prize.service';

@Controller('prize')
export class PrizeController {
  constructor(private readonly prizeService: PrizeService) {}

  @Get('')
  async getPrizes(
    @Query('cursor') cursor: string,
    @Query('category') category: string,
  ) {
    // This method can be used to fetch available prizes or any other prize-related data
    return this.prizeService.getPrizeList(category, cursor);
  }
}
