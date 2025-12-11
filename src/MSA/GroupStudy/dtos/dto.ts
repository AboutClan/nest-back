import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { IGroupStudyData } from '../entity/groupStudy.entity';

// DTOs for request validation
export class CreateGroupStudyDto {
  @IsNotEmpty({ message: 'groupStudy필요' })
  groupStudy: IGroupStudyData;
}

export class ParticipateGroupStudyDto {
  @IsNotEmpty({ message: 'id필요' })
  @IsNumber()
  id: number;
}

export class inviteGroupStudyDto {
  @IsNotEmpty({ message: 'id필요' })
  @IsNumber()
  id: number;

  @IsNotEmpty({ message: 'userId 필요' })
  @IsNumber()
  userId: number;
}

export class CommentDto {
  @IsNotEmpty({ message: 'id필요' })
  @IsNumber()
  id: string;

  @IsNotEmpty({ message: 'comment필요' })
  @IsString()
  comment: string;
}

export class PatchRole {
  @IsNotEmpty({ message: 'groupId필요' })
  @IsNumber()
  groupId: string;

  @IsNotEmpty({ message: 'userId필요' })
  @IsString()
  userId: string;

  @IsNotEmpty({ message: 'role필요' })
  @IsString()
  role: string;
}
