import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import RegisterService from './register.service';
import { ApproveUserDto, RegisterUserDto } from './dto';

@Controller('register')
export class RegisterController {
  constructor(private readonly registerService: RegisterService) {}

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

  @Post()
  async registerUser(@Body() registerUserDto: RegisterUserDto) {
    try {
      await this.registerService.register(registerUserDto);
      return { status: 'success' };
    } catch (err) {
      throw new HttpException(
        'Error registering user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('approval')
  async approveUser(@Body() approveUserDto: ApproveUserDto) {
    try {
      await this.registerService.approve(approveUserDto.uid);
      return { status: 'success' };
    } catch (err) {
      throw new HttpException(
        'Error approving user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('approval')
  async deleteUser(@Body() approveUserDto: ApproveUserDto) {
    try {
      await this.registerService.deleteRegisterUser(approveUserDto.uid, null);
      return { status: 'success' };
    } catch (err) {
      throw new HttpException(
        'Error deleting user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
