import {
  Controller,
  Get,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import StaticService from './static.service';

@ApiTags('static')
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
