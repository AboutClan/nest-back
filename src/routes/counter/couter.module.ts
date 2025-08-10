import { ClassProvider, Module } from '@nestjs/common';
import { CounterSchema } from 'src/routes/counter/counter.entity';
import { MongooseModule } from '@nestjs/mongoose';
import { CounterService } from './counter.service';
import { ICOUNTER_REPOSITORY } from 'src/utils/di.tokens';
import { MongoCounterRepository } from './counter.repository';

const counterRepositoryProvider: ClassProvider = {
  provide: ICOUNTER_REPOSITORY,
  useClass: MongoCounterRepository,
};

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Counter', schema: CounterSchema }]),
  ],
  controllers: [],
  providers: [CounterService, counterRepositoryProvider],
  exports: [CounterService, MongooseModule, counterRepositoryProvider],
})
export class CounterModule {}
