import { CreateNewVoteDTO } from './vote2.dto';

export interface IVote2Service {
  setVote(date: Date, createVote: CreateNewVoteDTO);
  setResult(date: Date);
}
