import { IsArray, IsOptional, IsString } from 'class-validator';

export class CreateNewVoteDTO {
  @IsString()
  @IsOptional()
  latitude: string;

  @IsOptional()
  @IsString()
  longitude: string;

  @IsOptional()
  @IsString()
  start: string;

  @IsOptional()
  @IsString()
  end: string;
}
export class CreateNewVotesDTO {
  @IsString()
  @IsOptional()
  latitude: string;

  @IsOptional()
  @IsString()
  longitude: string;

  @IsOptional()
  @IsString()
  start: string;

  @IsOptional()
  @IsString()
  end: string;

  @IsOptional()
  @IsArray()
  dates: string[];
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

  @IsString()
  end: string;
}
