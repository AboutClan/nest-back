import {
  IsNotEmpty,
  IsString,
  IsArray,
  IsOptional,
  IsNumber,
} from 'class-validator';

export class UpdateAvatarDto {
  @IsNumber()
  type: number;

  @IsNumber()
  bg: number;
}

export class UpdateCommentDto {
  @IsNotEmpty()
  @IsString()
  comment: string;
}

export class UpdateInstagramDto {
  @IsNotEmpty()
  @IsString()
  instagram: string;
}

export class PatchRoleDto {
  @IsNotEmpty()
  @IsString()
  role: string;
}

export class SetPreferenceDto {
  @IsNotEmpty()
  @IsString()
  place: string;

  @IsOptional()
  @IsArray()
  subPlace: string[];
}

export class SetPromotionDto {
  @IsNotEmpty()
  @IsString()
  name: string;
}

export class SetFriendDto {
  @IsNotEmpty()
  @IsString()
  toUid: string;
}

export class PatchBelongDto {
  @IsNotEmpty()
  @IsString()
  uid: string;

  @IsNotEmpty()
  @IsString()
  belong: string;
}

export class PatchIsPrivateDto {
  @IsNotEmpty()
  isPrivate: boolean;
}

export class SetMonthStudyTargetDto {
  @IsNotEmpty()
  @IsNumber()
  monthStudyTarget: number;
}

export class PatchIsLocationSharingDeniedDto {
  @IsNotEmpty()
  isLocationSharingDenided: boolean;
}

export class PatchRestDto {
  @IsNotEmpty()
  info: any;
}

export class ParticipationRateQueryDto {
  @IsNotEmpty()
  @IsString()
  startDay: string;

  @IsNotEmpty()
  @IsString()
  endDay: string;

  @IsOptional()
  @IsString()
  location?: string | null;

  @IsOptional()
  summary: boolean;
}

export class VoteRateQueryDto {
  @IsNotEmpty()
  @IsString()
  startDay: string;

  @IsNotEmpty()
  @IsString()
  endDay: string;
}

export class UpdateProfileDto {
  @IsNotEmpty()
  registerForm: any;
}

export class UpdateDepositDto {
  @IsOptional()
  @IsNumber()
  deposit: number;

  @IsOptional()
  @IsString()
  message: string;

  @IsOptional()
  sub: any;
}

export class UpdateScoreDto {
  @IsOptional()
  @IsNumber()
  score: number;

  @IsOptional()
  @IsString()
  message: string;

  @IsOptional()
  sub: any;
}

export class UpdatePointDto {
  @IsOptional()
  @IsNumber()
  point: number;

  @IsOptional()
  @IsString()
  message: string;

  @IsOptional()
  sub: any;
}

export class PatchStudyTargetHourDto {
  @IsNotEmpty()
  @IsNumber()
  hour: number;
}

export class PatchLocationDetailDto {
  @IsOptional()
  @IsString()
  text: string;

  @IsNotEmpty()
  @IsString()
  lat: string;

  @IsNotEmpty()
  @IsString()
  lon: string;
}

export class AddBadgeDto {
  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsNotEmpty()
  @IsString()
  badgeName: string;
}

export class SelectBadgeDto {
  @IsNotEmpty()
  @IsNumber()
  badgeIdx: number;
}

export class UpdateTicketDto {
  @IsNotEmpty()
  @IsNumber()
  ticketNum: number;

  @IsNotEmpty()
  @IsString()
  type: 'gather' | 'groupStudy' | 'groupOnline' | 'groupOffline';
}
