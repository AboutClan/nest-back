import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import PlaceService from './place.service';

@ApiTags('place')
@Controller('place')
export class PlaceController {
  constructor(private readonly placeService: PlaceService) {}

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

  @Post('review')
  async addReview(
    @Body('placeId') placeId: string,
    @Body('review') review: string,
    @Body('rating') rating: number,
    @Body('isSecret') isSecret: boolean,
  ) {
    try {
      console.log(placeId, isSecret, review);
      const places = await this.placeService.addReview(
        placeId,
        review,
        rating,
        isSecret,
      );
      return places;
    } catch (err) {
      throw new HttpException(
        'Error adding review',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
