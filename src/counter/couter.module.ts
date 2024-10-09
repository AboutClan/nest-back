import { Module } from '@nestjs/common';
import { CounterSchema } from 'src/counter/entity/counter.entity';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Counter', schema: CounterSchema }]),
  ],
  controllers: [],
  providers: [],
  exports: [MongooseModule],
})
export class CounterModule {}
