import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { IGroupStudyData } from './groupStudy.entity';

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

export class CommentDto {
  @IsNotEmpty({ message: 'id필요' })
  @IsNumber()
  id: string;

  @IsNotEmpty({ message: 'comment필요' })
  @IsString()
  comment: string;
}
