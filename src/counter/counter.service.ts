import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ICounter } from './entity/counter.entity';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { Model } from 'mongoose';
import { ICounterService } from './counterService.interface';

@Injectable()
export class CounterService implements ICounterService {
  private token;
  constructor(
    @InjectModel('Counter') private Counter: Model<ICounter>,
    @Inject(REQUEST) private readonly request: Request, // Request 객체 주입
  ) {
    this.token = this.request.decodedToken;
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
