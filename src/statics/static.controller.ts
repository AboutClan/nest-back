import {
  Controller,
  Get,
  Query,
  HttpException,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import StaticService from './static.service';

@Controller('static')
export class StaticController {
  constructor(private readonly staticService: StaticService) {}

  @Get('sameLoc')
  async getUserStaticSameLocation(@Query('date') date: string) {
    try {
      const result = await this.staticService.getUserInSameLocation(date);
      return result;
    } catch (err) {
      throw new HttpException(
        'Error fetching data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
