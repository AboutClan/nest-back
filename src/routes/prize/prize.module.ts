import { ClassProvider, Module } from '@nestjs/common';
import { IPRIZE_REPOSITORY } from 'src/utils/di.tokens';
import { PrizeRepository } from './PrizeRepository';
import { MongooseModule } from '@nestjs/mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { PrizeSchema } from './prize.entity';
import { PrizeController } from './prize.controller';
import { PrizeService } from './prize.service';

const placeRepositoryProvider: ClassProvider = {
  provide: IPRIZE_REPOSITORY,
  useClass: PrizeRepository,
};

@Module({
  imports: [
    MongooseModule.forFeature([{ name: DB_SCHEMA.PRIZE, schema: PrizeSchema }]),
  ],
  controllers: [PrizeController],
  providers: [PrizeService, placeRepositoryProvider],
  exports: [PrizeService, MongooseModule, placeRepositoryProvider],
})
export class PrizeModule {}
