import { IsNotEmpty, IsNumber } from 'class-validator';

// DTOs for request validation
export class CreateGatherDto {
  @IsNotEmpty({ message: 'gather필요' })
  gather: string;
}

export class DeleteGatherDto {
  @IsNotEmpty({ message: 'gatherId필요' })
  @IsNumber()
  gatherId: number;
}

export class SetWaitingPersonDto {
  @IsNotEmpty({ message: 'id필요' })
  @IsNumber()
  id: number;
}

export class ParticipateGatherDto {
  @IsNotEmpty({ message: 'gatherId필요' })
  @IsNumber()
  gatherId: number;
  phase: string;
  userId: string;
}
