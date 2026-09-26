import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';

export class AnchorDTO {
  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsOptional()
  @IsString()
  locationDetail: string;
}

/** 날짜별 참여 시간. 주간 신청에서 날짜마다 다른 시간을 보낼 때 쓴다. */
export class DateTimeDTO {
  @IsString()
  date: string;

  @IsString()
  start: string;

  @IsString()
  end: string;
}

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

  // 매칭 기준점 1~2개. 없으면 서버가 latitude/longitude로 정규화한다.
  @IsOptional()
  @IsArray()
  anchors?: AnchorDTO[];
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

  /**
   * 날짜별로 다른 참여 시간. 여기에 있는 날짜만 이 값을 쓰고,
   * 나머지는 공용 start/end를 쓴다. 안 보내면 예전과 동일하게 동작한다.
   */
  @IsOptional()
  @IsArray()
  dateTimes?: DateTimeDTO[];

  @IsOptional()
  @IsArray()
  locationDetail: string;

  @IsOptional()
  @IsNumber()
  eps: number;

  @IsOptional()
  @IsNumber()
  userId: string;

  @IsOptional()
  @IsArray()
  anchors?: AnchorDTO[];
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
