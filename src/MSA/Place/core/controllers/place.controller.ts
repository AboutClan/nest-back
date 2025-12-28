import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import PlaceService from '../services/place.service';

@ApiTags('place')
@Controller('place')
export class PlaceController {
  constructor(private readonly placeService: PlaceService) {}

  @Get()
  async getActivePlace(
    @Query('status') status: 'main' | 'best' | 'good' | 'all' = 'all',
  ) {
    const places = await this.placeService.getActivePlace(status);
    return places;
  }

  @Get('one')
  async getNeatStudyPlace(@Query('placeId') placeId: string) {
    const places = await this.placeService.getNearPlace(placeId);
    return places;
  }

  @Get('all')
  async getAllPlace() {
    const places = await this.placeService.getAllPlace();
    return places;
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

  @Patch('location')
  async updateLocation(
    @Body('placeId') placeId: string,
    @Body('location') location: any,
  ) {
    const places = await this.placeService.updateLocation(placeId, location);
    return places;
  }

  @Post('rating')
  async updateRating(
    @Body('placeId') placeId: string,
    @Body('mood') mood: number,
    @Body('table') table: number,
    @Body('beverage') beverage: number,
    @Body('etc') etc: number,
  ) {
    try {
      const places = await this.placeService.addRating(
        placeId,
        mood,
        table,
        beverage,
        etc,
      );
      return places;
    } catch (err) {
      throw new HttpException(
        'Error updating rating',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('test')
  async test() {
    const places = await this.placeService.test();
    return places;
  }
}
