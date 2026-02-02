import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateNewVoteDTO {
  @IsString()
  @IsOptional()
  userId: string;

  @IsString()
  @IsOptional()
  latitude: string;

  @IsOptional()
  @IsString()
  longitude: string;

  @IsOptional()
  @IsString()
  locationDetail: string;

  @IsOptional()
  @IsString()
  start: string;

  @IsOptional()
  @IsString()
  end: string;

  @IsOptional()
  @IsNumber()
  eps: number;
}
export class CreateNewVotesDTO {
  @IsString()
  @IsOptional()
  type: 'invite';

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

  @IsOptional()
  @IsArray()
  locationDetail: string;

  @IsOptional()
  @IsNumber()
  eps: number;

  @IsOptional()
  @IsNumber()
  userId: string;
}

export class CreateParticipateDTO {
  @IsString()
  start: string;

  @IsString()
  end: string;

  @IsString()
  placeId: string;

  @IsOptional()
  @IsNumber()
  eps: number;
}

export class CreateArriveDTO {
  @IsString()
  memo: string;

  @IsString()
  end: string;
}
