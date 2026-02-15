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

  @Post('approval')
  async approveUser(@Body() approveUserDto: ApproveUserDto) {
    try {
      await this.registerService.approve(approveUserDto.uid);
      return { status: 'success' };
    } catch (err) {
      throw new HttpException(err, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete('approval')
  async deleteUser(@Body() approveUserDto: ApproveUserDto) {
    try {
      await this.registerService.deleteRegisterUser(approveUserDto.uid, false);
      return { status: 'success' };
    } catch (err) {
      throw new HttpException(
        'Error deleting user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
