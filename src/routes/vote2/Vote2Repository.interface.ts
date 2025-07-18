import { IVote2 } from './vote2.entity';
import { Vote2 } from 'src/domain/entities/Vote2/Vote2';

export interface IVote2Repository {
  findByDate(date: string): Promise<IVote2 | null>;
}
