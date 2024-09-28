import { Module } from '@nestjs/common';
import { PromotionController } from './promotion.controller';
import PromotionService from './promotion.service';
import { UserService } from 'src/user/user.service';

@Module({
  imports: [UserService],
  controllers: [PromotionController],
  providers: [PromotionService],
  exports: [PromotionService],
})
export class AppModule {}
