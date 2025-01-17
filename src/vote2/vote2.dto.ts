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

export class CreateParticipateDTO {
  @IsString()
  start: string;

  @IsString()
  end: string;

  @IsString()
  placeId: string;
}

export class CreateArriveDTO {
  @IsString()
  memo: string;
}
