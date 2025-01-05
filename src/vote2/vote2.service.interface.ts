import { CreateNewVoteDTO, CreateParticipateDTO } from './vote2.dto';

export interface IVote2Service {
  setVote(date: Date, createVote: CreateNewVoteDTO);
  deleteVote(date: Date);
  setResult(date: Date);
  setArrive(date: Date, memo: string);
  patchArrive(date: Date);
  setParticipate(date: Date, createParticipate: CreateParticipateDTO);
}
