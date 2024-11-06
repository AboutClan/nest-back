import {
  IsNotEmpty,
  IsString,
  IsArray,
  IsOptional,
  IsNumber,
} from 'class-validator';

export class UpdateAvatarDto {
  @IsNotEmpty()
  @IsNumber()
  type: number;

  @IsNotEmpty()
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
