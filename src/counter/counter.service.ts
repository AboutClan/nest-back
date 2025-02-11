import { Inject, Injectable } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { DatabaseError } from 'src/errors/DatabaseError';
import { ICOUNTER_REPOSITORY } from 'src/utils/di.tokens';
import { CounterRepository } from './counter.repository.interface';

@Injectable()
export class CounterService {
  private token;
  constructor(
    @Inject(ICOUNTER_REPOSITORY)
    private readonly counterRepository: CounterRepository,
    @Inject(REQUEST) private readonly request: Request, // Request 객체 주입
  ) {
    this.token = this.request.decodedToken;
  }
  async setCounter(key: string, location: string) {
    const findData = await this.counterRepository.findByKeyAndLoc(
      key,
      location,
    );
    if (findData) {
      await this.counterRepository.increaseByKeyAndLoc(key, location);
    } else {
      await this.counterRepository.createCounter({
        key,
        seq: 1,
        location,
      });
    }
    return;
  }

  async getCounter(key: string, location: string) {
    const result = await this.counterRepository.findByKeyAndLoc(key, location);
    if (!result) throw new DatabaseError("can't find counter");
    return result.seq;
  }

  async getNextSequence(name: any) {
    const updatedCounter = await this.counterRepository.increaseByKey(name);
    return updatedCounter.seq;
  }
}
