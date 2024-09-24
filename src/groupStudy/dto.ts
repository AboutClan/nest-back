import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

// DTOs for request validation
class CreateGroupStudyDto {
  @IsNotEmpty({ message: 'groupStudy필요' })
  groupStudy: string;
}

class ParticipateGroupStudyDto {
  @IsNotEmpty({ message: 'id필요' })
  @IsNumber()
  id: number;
}

class CommentDto {
  @IsNotEmpty({ message: 'id필요' })
  @IsNumber()
  id: number;

  @IsNotEmpty({ message: 'comment필요' })
  @IsString()
  comment: string;
}
