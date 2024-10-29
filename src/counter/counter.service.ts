import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ICounter } from './entity/counter.entity';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { Model } from 'mongoose';
import { ICounterService } from './counterService.interface';
import { DatabaseError } from 'src/errors/DatabaseError';

@Injectable()
export class CounterService implements ICounterService {
  private token;
  constructor(
    @InjectModel('Counter') private Counter: Model<ICounter>,
    @Inject(REQUEST) private readonly request: Request, // Request 객체 주입
  ) {
    this.token = this.request.decodedToken;
  }
  async setCounter(key: string, location: string) {
    const findData = await this.Counter.findOne({ key, location });
    if (findData) {
      await this.Counter.updateOne({ key, location }, { $inc: { seq: 1 } });
    } else {
      await this.Counter.create({
        key,
        seq: 1,
        location,
      });
    }
    return;
  }

  async getCounter(key: string, location: string) {
    const result = await this.Counter.findOne({ key, location });
    if (!result) throw new DatabaseError("can't find counter");
    return result.seq;
  }

  async getNextSequence(name: any) {
    const updatedCounter = await this.Counter.findOneAndUpdate(
      { key: name }, // 조건
      { $inc: { seq: 1 } }, // 업데이트 내용
      { new: true }, // 업데이트 후의 값을 반환하도록 설정
    );
    return updatedCounter.seq;
  }
}
