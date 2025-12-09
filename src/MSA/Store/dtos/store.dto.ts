import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { IStoreStatus, Store } from 'src/domain/entities/Store/Store';

export class CreateStoreDto {
  @IsNotEmpty({ message: 'name필요' })
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  image: string;

  @IsNotEmpty({ message: 'point필요' })
  @IsNumber()
  point: number;

  @IsNotEmpty({ message: 'winnerCnt필요' })
  @IsNumber()
  winnerCnt: number;

  @IsNotEmpty({ message: 'status필요' })
  @IsString()
  status: IStoreStatus;

  @IsNotEmpty({ message: 'max필요' })
  @IsNumber()
  max: number;
}
