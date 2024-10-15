import {
  Controller,
  Get,
  Query,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { ISTATIC_SERVICE } from 'src/utils/di.tokens';
import { IStaticService } from './staticService.interface';

@Controller('static')
export class StaticController {
  constructor(@Inject(ISTATIC_SERVICE) private staticService: IStaticService) {}

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
