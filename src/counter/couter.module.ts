import { Module } from '@nestjs/common';
import { CounterSchema } from 'src/counter/entity/counter.entity';
import { MongooseModule } from '@nestjs/mongoose';
import { CounterService } from './counter.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Counter', schema: CounterSchema }]),
  ],
  controllers: [],
  providers: [CounterService],
  exports: [CounterService, MongooseModule],
})
export class CounterModule {}
