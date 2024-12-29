import { IsString } from 'class-validator';

export class CreateNewVoteDTO {
  @IsString()
  latitude: string;

  @IsString()
  longitude: string;

  @IsString()
  start: string;

  @IsString()
  end: string;
}
