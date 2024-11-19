import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { IPLACE_SERVICE } from 'src/utils/di.tokens';
import { IPlaceService } from './placeService.interface';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('place')
@Controller('place')
export class PlaceController {
  constructor(@Inject(IPLACE_SERVICE) private placeService: IPlaceService) {}

  @Get()
  async getActivePlace(
    @Query('status') status: 'active' | 'inactive' = 'active',
  ) {
    try {
      const places = await this.placeService.getActivePlace(status);
      return places;
    } catch (err) {
      throw new HttpException(
        'Error fetching places',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  //todo: 타입 정의 필요
  @Post()
  async addPlace(@Body() placeInfo: any) {
    try {
      const places = await this.placeService.addPlace(placeInfo);
      return places;
    } catch (err) {
      throw new HttpException(
        'Error adding place',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('status')
  async updateStatus(
    @Body('placeId') placeId: string,
    @Body('status') status: 'active' | 'inactive',
  ) {
    try {
      const places = await this.placeService.updateStatus(placeId, status);
      return places;
    } catch (err) {
      throw new HttpException(
        'Error updating place status',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
