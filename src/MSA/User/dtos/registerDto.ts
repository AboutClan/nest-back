import { IsNotEmpty } from 'class-validator';

// DTOs for request validation
export class ApproveUserDto {
  @IsNotEmpty({ message: 'uid필요' })
  uid: string;
}
