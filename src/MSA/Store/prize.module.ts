import { ClassProvider, forwardRef, Module } from '@nestjs/common';
import { IPRIZE_REPOSITORY } from 'src/utils/di.tokens';
import { PrizeRepository } from './infra/PrizeRepository';
import { MongooseModule } from '@nestjs/mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { PrizeSchema } from './entity/prize.entity';
import { PrizeService } from './core/services/prize.service';
import { UserModule } from '../User/user.module';
import { PrizeController } from './core/controllers/prize.controller';

const placeRepositoryProvider: ClassProvider = {
  provide: IPRIZE_REPOSITORY,
  useClass: PrizeRepository,
};

@Module({
  imports: [
    MongooseModule.forFeature([{ name: DB_SCHEMA.PRIZE, schema: PrizeSchema }]),
    forwardRef(() => UserModule),
  ],
  controllers: [PrizeController],
  providers: [PrizeService, placeRepositoryProvider],
  exports: [PrizeService, MongooseModule, placeRepositoryProvider],
})
export class PrizeModule {}
