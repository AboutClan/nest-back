import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CreateStoreDto } from '../../dtos/store.dto';
import { StoreService } from '../services/store.service';

@Controller('store')
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  @Get()
  async getStores(
    @Query('status') status: string,
    @Query('cursor') cursor: number,
  ) {
    return this.storeService.getStores(status, cursor);
  }

  @Get('test')
  async test() {
    return this.storeService.test();
  }

  @Get(':id')
  async getStoreById(@Param('id') id: string) {
    return this.storeService.getStoreById(id);
  }

  @Post()
  async applyStore(@Body() storeInfo: CreateStoreDto) {
    return this.storeService.createStore(storeInfo);
  }

  @Post('vote')
  async voteStore(@Body('storeId') storeId: string, @Body('cnt') cnt: number) {
    return this.storeService.voteStore(storeId, cnt);
  }
}
