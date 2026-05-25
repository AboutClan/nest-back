import {
    BadRequestException,
    Body,
    Controller,
    Get,
    Headers,
    Post,
    Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/decorator/Public';
import {
    AuthLoginResponseDto,
    AuthSessionDto,
    CredentialsLoginDto,
    OAuthCallbackQueryDto,
} from '../../dtos/auth.dto';
import { AuthService } from '../services/auth.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Public()
    @Post('guest')
    @ApiOperation({ summary: '게스트 로그인 (NextAuth Credentials guest)' })
    loginGuest(): Promise<AuthLoginResponseDto> {
        return this.authService.loginGuest();
    }

    @Public()
    @Post('credentials')
    @ApiOperation({ summary: '테스트 계정 로그인 (NextAuth Credentials)' })
    loginCredentials(
        @Body() dto: CredentialsLoginDto,
    ): Promise<AuthLoginResponseDto> {
        return this.authService.loginCredentials(dto.username);
    }

    @Public()
    @Get('kakao/url')
    @ApiOperation({ summary: '카카오 OAuth 인가 URL' })
    getKakaoUrl(@Query('redirectUri') redirectUri: string) {
        return this.authService.getKakaoAuthorizeUrl(redirectUri);
    }

    @Public()
    @Get('kakao/callback')
    @ApiOperation({ summary: '카카오 OAuth 콜백 — JWT 발급' })
    kakaoCallback(
        @Query() query: OAuthCallbackQueryDto,
    ): Promise<AuthLoginResponseDto> {
        const redirectUri =
            query.redirectUri ?? process.env.KAKAO_REDIRECT_URI;
        if (!redirectUri) {
            throw new BadRequestException(
                'redirectUri 쿼리 또는 KAKAO_REDIRECT_URI 환경변수가 필요합니다.',
            );
        }
        return this.authService.loginKakao(query.code, redirectUri);
    }

    @Public()
    @Get('apple/url')
    @ApiOperation({ summary: 'Apple OAuth 인가 URL' })
    getAppleUrl(@Query('redirectUri') redirectUri: string) {
        return this.authService.getAppleAuthorizeUrl(redirectUri);
    }

    @Public()
    @Post('apple/callback')
    @ApiOperation({ summary: 'Apple OAuth 콜백 — JWT 발급' })
    appleCallback(
        @Body('code') code: string,
        @Body('redirectUri') redirectUri?: string,
    ): Promise<AuthLoginResponseDto> {
        const uri = redirectUri ?? process.env.APPLE_REDIRECT_URI;
        if (!uri) {
            throw new BadRequestException(
                'redirectUri 또는 APPLE_REDIRECT_URI 환경변수가 필요합니다.',
            );
        }
        return this.authService.loginApple(code, uri);
    }

    @Public()
    @Get('session')
    @ApiOperation({ summary: '세션 조회 (NextAuth session 콜백)' })
    @ApiBearerAuth()
    getSession(
        @Headers('authorization') authorization?: string,
    ): Promise<AuthSessionDto> {
        const token = authorization?.replace(/^Bearer\s+/i, '') ?? '';
        return this.authService.getSession(token);
    }

    @Public()
    @Post('refresh')
    @ApiOperation({ summary: 'JWT 갱신 (NextAuth jwt refresh)' })
    @ApiBearerAuth()
    refresh(
        @Headers('authorization') authorization?: string,
    ): Promise<AuthLoginResponseDto> {
        const token = authorization?.replace(/^Bearer\s+/i, '') ?? '';
        return this.authService.refreshSession(token);
    }
}
