import { InjectModel } from '@nestjs/mongoose';
import { CounterRepository } from './counter.repository';
import { ICounter } from './entity/counter.entity';
import { Model } from 'mongoose';

export class MongoCounterRepository implements CounterRepository {
  constructor(
    @InjectModel('Counter')
    private readonly Counter: Model<ICounter>,
  ) {}
  async findByKeyAndLoc(key: string, location: string): Promise<ICounter> {
    return await this.Counter.findOne({ key, location });
  }
  async increaseByKeyAndLoc(key: string, location: string): Promise<any> {
    return await this.Counter.updateOne(
      { key, location },
      { $inc: { seq: 1 } },
    );
  }
  async createCounter(counterData: any): Promise<ICounter> {
    return await this.Counter.create(counterData);
  }
  async increaseByKey(key: string): Promise<any> {
    return await this.Counter.findOneAndUpdate(
      { key }, // 조건
      { $inc: { seq: 1 } }, // 업데이트 내용
      { new: true }, // 업데이트 후의 값을 반환하도록 설정
    );
  }
}
