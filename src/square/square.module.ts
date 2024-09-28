import { Module } from '@nestjs/common';
import { SquareController } from './square.controller';
import SquareService from './square.service';
import ImageService from 'src/imagez/image.service';

@Module({
  imports: [ImageService],
  controllers: [SquareController],
  providers: [SquareService],
  exports: [SquareService],
})
export class AppModule {}
