import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApproveUserDto } from '../../dtos/registerDto';
import { ApiTags } from '@nestjs/swagger';
import { CLUB_UIDS } from 'src/MSA/Auth/constants/auth-users.constant';
import { RequestContext } from 'src/request-context';
import RegisterService from '../services/register.service';

@ApiTags('register')
@Controller('register')
export class RegisterController {
  constructor(private readonly registerService: RegisterService) { }

  @Get()
  async getRegisteredUsers() {
    try {
      const registeredUsers = await this.registerService.getRegister();
      return registeredUsers;
    } catch (err) {
      throw new HttpException(
        'Error fetching registered users',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  //todo: dto수정 필요
  @Post()
  async registerUser(@Body() registerUserDto: any) {
    await this.registerService.register(registerUserDto);
    return { status: 'success' };
  }

  @Post('cafe')
  async cafeRegister(@Body() registerUserDto: any) {
    await this.registerService.registerCafe(registerUserDto);
    return { status: 'success' };
  }

  @Post('direct')
  async directRegister(@Body() registerUserDto: any) {
    await this.registerService.directRegister(registerUserDto);
    return { status: 'success' };
  }

  // 결제 없이 가입을 승인하는 통로이므로 두 경우만 허용한다.
  // (1) 운영진이 대기중인 다른 유저를 승인하는 경우 (관리자 페이지)
  // (2) 본인이 동아리 관계자의 정당한 추천 코드로 전액 할인을 받아 스스로를 승인하는 경우
  // 일반(결제) 가입 승인은 이 엔드포인트를 타지 않고 cookiepay 웹훅/내부 키를 통해서만 처리된다.
  @Post('approval')
  async approveUser(@Body() approveUserDto: ApproveUserDto) {
    try {
      const token = RequestContext.getDecodedToken();
      if (!token?.uid) {
        throw new HttpException('로그인이 필요합니다.', HttpStatus.UNAUTHORIZED);
      }

      const { uid, referrerUid } = approveUserDto;

      if (uid === token.uid) {
        if (!referrerUid || !CLUB_UIDS.has(referrerUid)) {
          throw new HttpException(
            '결제 없이 가입을 완료할 수 없습니다.',
            HttpStatus.FORBIDDEN,
          );
        }
      } else if (!(await this.registerService.isAdmin(token.uid))) {
        throw new HttpException('권한이 없습니다.', HttpStatus.FORBIDDEN);
      }

      await this.registerService.approve(uid, referrerUid);
      return { status: 'success' };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new HttpException(err, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // 타인의 가입 신청을 거절/삭제하는 것은 운영진만 가능하다.
  @Delete('approval')
  async deleteUser(@Body() approveUserDto: ApproveUserDto) {
    try {
      const token = RequestContext.getDecodedToken();
      if (!token?.uid || !(await this.registerService.isAdmin(token.uid))) {
        throw new HttpException('권한이 없습니다.', HttpStatus.FORBIDDEN);
      }

      await this.registerService.deleteRegisterUser(approveUserDto.uid, false);
      return { status: 'success' };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new HttpException(
        'Error deleting user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('test')
  async test() {
    try {
      return await this.registerService.test();
    } catch (err) {
      throw new HttpException(err, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
