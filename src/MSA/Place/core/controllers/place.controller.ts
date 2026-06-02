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

  @Post('gpt-rating')
  async evaluatePlaceWithGpt(
    @Body('placeId') placeId: string,
    @Body('externalReviews') externalReviews: string[] = [],
  ) {
    return await this.placeService.evaluatePlaceWithGpt(
      placeId,
      externalReviews,
    );
  }

  @Get('cursor')
  async getPlacesWithCursor(@Query('cursor') cursor: string = '0') {
  
    await this.placeService.processAllPlacesStudyCafe();
    // return await this.placeService.getPlacesWithCursor(parseInt(cursor));
  }

  @Get('ratings')
  async getAllRatingsSorted(@Query('cursor') cursor: string = '0') {
    return await this.placeService.getAllRatingsSorted(parseInt(cursor));
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
      const { review: initialRating, ...placeData } = placeInfo;

      const places = await this.placeService.addPlace(placeData, initialRating);
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
    @Body('power') power: number,
    @Body('space') space: number,
    @Body('etc') etc: number,
    @Body('comment') comment: string,
    @Body('name') name: string,
  ) {
    try {
      const places = await this.placeService.addRating(
        placeId,
        mood,
        power,
        space,
        etc,
        comment,
        name,
      );
      return places;
    } catch (err) {
      throw new HttpException(
        'Error updating rating',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('migrate-power')
  async migrateRatingTableToPower() {
    await this.placeService.migrateRatingTableToPower();
    return { message: 'migration completed' };
  }

  @Post('test')
  async test() {
    const places = await this.placeService.test();
    return places;
  }
}
