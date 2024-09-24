import { Module } from '@nestjs/common';
import { SquareController } from './square.controller';
import SquareService from './square.service';

@Module({
  imports: [],
  controllers: [SquareController],
  providers: [SquareService],
  exports: [SquareService],
})
export class AppModule {}
