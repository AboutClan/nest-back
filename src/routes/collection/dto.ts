import { IsString } from 'class-validator';

export class updateCollectionDTO {
  @IsString()
  mine: string;

  @IsString()
  opponent: string;

  @IsString()
  myId: string;

  @IsString()
  toUid: string;
}
export class updateAlpabetDTO {
  @IsString()
  alphabet: 'A' | 'B' | 'O' | 'U' | 'T';
}
