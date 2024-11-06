import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { ApproveUserDto } from './dto';
import { IREGISTER_SERVICE } from 'src/utils/di.tokens';
import { IRegisterService } from './registerService.interface';

@Controller('register')
export class RegisterController {
  constructor(
    @Inject(IREGISTER_SERVICE) private registerService: IRegisterService,
  ) {}

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
      throw new HttpException(err, HttpStatus.INTERNAL_SERVER_ERROR);
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
