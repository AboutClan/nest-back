import { ICounter } from './counter.entity';

export interface CounterRepository {
  findByKeyAndLoc(key: string, location: string): Promise<ICounter>;
  increaseByKeyAndLoc(key: string, location: string): Promise<any>;
  createCounter(counterData): Promise<ICounter>;
  increaseByKey(key: string): Promise<ICounter>;
}
