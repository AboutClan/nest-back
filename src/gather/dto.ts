import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { IGatherData } from './entity/gather.entity';

// DTOs for request validation
export class CreateGatherDto {
  @IsNotEmpty({ message: 'gather필요' })
  gather: IGatherData;
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

export class ParticipateGatherDto {
  @IsNotEmpty({ message: 'gatherId필요' })
  @IsNumber()
  gatherId: string;
  phase: string;
  userId: string;
}
