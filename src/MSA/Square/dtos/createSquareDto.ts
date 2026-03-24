import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';
import { IAvatar } from 'src/MSA/User/core/domain/User/Avatar';
import {
  PollItem,
  SecretSquareCategory,
  SecretSquareType,
} from '../entity/square.entity';

export class CreateSquareDto {
  @IsNotEmpty({ message: 'Title is required' })
  title: string;

  @IsNotEmpty({ message: 'Content is required' })
  content: string;

  @IsIn(['poll', 'general'], { message: 'Invalid type' })
  type: SecretSquareType;

  @IsNotEmpty({ message: 'Category is required' })
  category: SecretSquareCategory;

  @IsOptional()
  avatar?: IAvatar;

  @IsOptional()
  @IsArray()
  pollItems?: PollItem[];

  @IsOptional()
  @IsBoolean()
  canMultiple?: boolean;
}
