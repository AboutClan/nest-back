import { ClassProvider, Module } from '@nestjs/common';
import { CounterSchema } from 'src/counter/entity/counter.entity';
import { MongooseModule } from '@nestjs/mongoose';
import { CounterService } from './counter.service';
import { ICOUNTER_SERVICE } from 'src/utils/di.tokens';

const counterServiceProvider: ClassProvider = {
  provide: ICOUNTER_SERVICE,
  useClass: CounterService,
};

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Counter', schema: CounterSchema }]),
  ],
  controllers: [],
  providers: [counterServiceProvider],
  exports: [counterServiceProvider, MongooseModule],
})
export class CounterModule {}
