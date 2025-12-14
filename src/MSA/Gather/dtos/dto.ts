import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { IGatherData } from '../entity/gather.entity';

// DTOs for request validation
export class CreateGatherDto {
  @IsNotEmpty({ message: 'gather필요' })
  gather: Partial<IGatherData>;
}

export class DeleteGatherDto {
  @IsNotEmpty({ message: 'gatherId필요' })
  @IsString()
  gatherId: string;
}

export class SetWaitingPersonDto {
  @IsNotEmpty({ message: 'id필요' })
  @IsString()
  id: string;

  @IsNotEmpty({ message: 'id필요' })
  phase: 'first' | 'second';
}

export class HandleWaitingPersonDto {
  @IsNotEmpty({ message: 'id필요' })
  @IsString()
  id: string;

  @IsString()
  userId: string;

  @IsString()
  status: string;

  @IsString()
  text: string;
}

export class ExileGatherDto {
  @IsNotEmpty({ message: 'gather id필요' })
  @IsNumber()
  gatherId: number;

  @IsNotEmpty({ message: 'user id필요' })
  @IsString()
  userId: string;
}

export class ParticipateGatherDto {
  @IsNotEmpty({ message: 'gatherId필요' })
  @IsNumber()
  gatherId: number;
  @IsOptional()
  phase?: string;
  @IsOptional()
  isFree?: boolean;
  @IsOptional()
  userId?: string;
}
