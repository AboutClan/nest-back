import { Vote } from './entity/vote.entity';

export const findOneVote = async (date: Date) =>
  await Vote.findOne({ date }).populate([
    'participations.place',
    'participations.attendences.user',
    'participations.absences.user',
  ]);
