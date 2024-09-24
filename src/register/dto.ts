// DTOs for request validation
class ApproveUserDto {
  @IsNotEmpty({ message: 'uid필요' })
  uid: string;
}

class RegisterUserDto {
  // 추가적인 필드를 정의할 수 있습니다. 예시:
  @IsNotEmpty({ message: 'name is required' })
  name: string;
}
