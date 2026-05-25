import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CredentialsLoginDto {
    @ApiProperty({ example: 'test@example.com' })
    @IsString()
    username: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    password?: string;
}

export class OAuthCallbackQueryDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    code: string;

    @ApiPropertyOptional({ description: '카카오 redirect_uri (등록값과 동일해야 함)' })
    @IsOptional()
    @IsString()
    redirectUri?: string;
}

export class SessionUserDto {
    id: string;
    uid: string;
    name: string;
    role: string;
    isActive: boolean;
    profileImage: string;
    location: string;
}

export class AuthSessionDto {
    user: SessionUserDto;
    expires: string;
}

export class AuthLoginResponseDto {
    @ApiProperty({ description: 'Bearer 토큰 (next-auth JWT 호환)' })
    accessToken: string;

    session: AuthSessionDto;
}
