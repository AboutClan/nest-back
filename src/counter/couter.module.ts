import { ClassProvider, Module } from '@nestjs/common';
import { CounterSchema } from 'src/counter/counter.entity';
import { MongooseModule } from '@nestjs/mongoose';
import { CounterService } from './counter.service';
import { ICOUNTER_REPOSITORY, ICOUNTER_SERVICE } from 'src/utils/di.tokens';
import { MongoCounterRepository } from './counter.repository';

const counterServiceProvider: ClassProvider = {
  provide: ICOUNTER_SERVICE,
  useClass: CounterService,
};

const counterRepositoryProvider: ClassProvider = {
  provide: ICOUNTER_REPOSITORY,
  useClass: MongoCounterRepository,
};

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Counter', schema: CounterSchema }]),
  ],
  controllers: [],
  providers: [counterServiceProvider, counterRepositoryProvider],
  exports: [counterServiceProvider, MongooseModule, counterRepositoryProvider],
})
export class CounterModule {}
