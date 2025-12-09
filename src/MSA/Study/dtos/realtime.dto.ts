import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsArray,
} from 'class-validator';

export class CreateBasicVoteDto {
  @IsString()
  @IsNotEmpty()
  readonly title: string;

  @IsString()
  @IsNotEmpty()
  readonly description: string;

  @IsNumber()
  @IsOptional()
  readonly voteCount?: number;
}

export class UpdateStudyDto {
  @IsString()
  @IsNotEmpty()
  readonly studyId: string;

  @IsString()
  @IsOptional()
  readonly title?: string;

  @IsString()
  @IsOptional()
  readonly description?: string;

  @IsString()
  @IsOptional()
  readonly status?: string;
}

export class MarkAttendanceDto {
  @IsString()
  @IsNotEmpty()
  readonly userId: string;

  @IsString()
  @IsNotEmpty()
  readonly studyId: string;

  @IsArray()
  @IsOptional()
  readonly attendanceData?: string[];
}
