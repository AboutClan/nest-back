import { Vote2 } from 'src/domain/entities/Vote2/Vote2';

export interface IVote2Repository {
  findByDate(date: string): Promise<Vote2 | null>;
  findByDateWithoutPopulate(date: string): Promise<Vote2 | null>;
  findById(id: string): Promise<Vote2 | null>;
  save(vote2: Vote2): Promise<void>;
  findParticipationsByDate(date: string): Promise<any>;
  getVoteByPeriod(startDay: string, endDay: string);
}
