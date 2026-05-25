import {
    ForbiddenException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { encode, decode } from 'next-auth/jwt';
import { JWT } from 'next-auth/jwt';
import dbConnect from 'src/Database/conn';
import { Account } from 'src/MSA/User/entity/account.entity';
import { User } from 'src/MSA/User/entity/user.entity';
import {
    BLOCKED_UIDS,
    DEFAULT_LOCATION,
    DEFAULT_PROFILE_IMAGE,
    GUEST_USER,
    MEMBER_GUEST_USER,
    SESSION_MAX_AGE_SEC,
} from '../../constants/auth-users.constant';
import { AuthLoginResponseDto, AuthSessionDto } from '../../dtos/auth.dto';
import { OAuthAuthService, OAuthTokenSet } from './oauth-auth.service';

export interface AuthUserPayload {
    id: string;
    uid: string;
    name: string;
    role: string;
    isActive: boolean;
    profileImage: string;
    location?: string;
    email?: string;
}

@Injectable()
export class AuthService {
    constructor(private readonly oauthAuthService: OAuthAuthService) {}

    private getJwtSecret(): string {
        const secret = process.env.JWT_TOKEN ?? process.env.NEXTAUTH_SECRET;
        if (!secret) {
            throw new Error('JWT_TOKEN 또는 NEXTAUTH_SECRET 환경변수가 필요합니다.');
        }
        return secret;
    }

    private toSessionUser(payload: AuthUserPayload) {
        if (payload.name === '게스트') {
            return { ...MEMBER_GUEST_USER };
        }
        if (payload.name === 'guest') {
            return { ...GUEST_USER };
        }
        return {
            id: payload.id,
            uid: payload.uid,
            name: payload.name ?? '게스트',
            role: payload.role,
            isActive: payload.isActive,
            profileImage: payload.profileImage,
            location: payload.location ?? DEFAULT_LOCATION,
        };
    }

    private buildSession(payload: AuthUserPayload): AuthSessionDto {
        const user = this.toSessionUser(payload);
        const expires = new Date(
            Date.now() + SESSION_MAX_AGE_SEC * 1000,
        ).toISOString();
        return { user, expires };
    }

    private async encodeToken(
        payload: Record<string, unknown>,
    ): Promise<string> {
        const token = await encode({
            token: payload,
            secret: this.getJwtSecret(),
            maxAge: SESSION_MAX_AGE_SEC,
        });
        if (!token) {
            throw new UnauthorizedException('JWT 발급 실패');
        }
        return token;
    }

    private async buildLoginResponse(
        jwtPayload: Record<string, unknown>,
        sessionUser: AuthUserPayload,
    ): Promise<AuthLoginResponseDto> {
        const accessToken = await this.encodeToken(jwtPayload);
        return {
            accessToken,
            session: this.buildSession(sessionUser),
        };
    }

    async loginGuest(): Promise<AuthLoginResponseDto> {
        return this.buildLoginResponse({ ...GUEST_USER }, GUEST_USER);
    }

    async loginCredentials(username: string): Promise<AuthLoginResponseDto> {
        void username;
        return this.buildLoginResponse({ ...MEMBER_GUEST_USER }, MEMBER_GUEST_USER);
    }

    getKakaoAuthorizeUrl(redirectUri: string): { url: string } {
        const params = new URLSearchParams({
            client_id: process.env.KAKAO_CLIENT_ID as string,
            redirect_uri: redirectUri,
            response_type: 'code',
        });
        return {
            url: `https://kauth.kakao.com/oauth/authorize?${params.toString()}`,
        };
    }

    getAppleAuthorizeUrl(redirectUri: string): { url: string } {
        const params = new URLSearchParams({
            client_id: process.env.APPLE_ID as string,
            redirect_uri: redirectUri,
            response_type: 'code',
            response_mode: 'form_post',
            scope: 'name email',
        });
        return {
            url: `https://appleid.apple.com/auth/authorize?${params.toString()}`,
        };
    }

    private assertNotBlocked(uid: string): void {
        if (BLOCKED_UIDS.has(uid)) {
            throw new ForbiddenException('로그인이 차단된 계정입니다.');
        }
    }

    /** NextAuth signIn 콜백 (kakao / apple) */
    private async processOAuthSignIn(
        provider: 'kakao' | 'apple',
        profile: AuthUserPayload,
        tokens: OAuthTokenSet,
    ): Promise<AuthUserPayload> {
        this.assertNotBlocked(profile.uid);
        await dbConnect();

        const findUser = await User.findOneAndUpdate(
            { uid: profile.uid },
            {
                $set: {
                    profileImage:
                        profile.profileImage || DEFAULT_PROFILE_IMAGE,
                },
            },
        );

        let result: AuthUserPayload = { ...profile };

        if (findUser) {
            result = {
                id: findUser._id?.toString() ?? profile.id,
                uid: findUser.uid ?? profile.uid,
                name: findUser.name ?? profile.name,
                role: findUser.role ?? profile.role,
                isActive: findUser.isActive ?? profile.isActive,
                profileImage:
                    findUser.profileImage ??
                    profile.profileImage ??
                    DEFAULT_PROFILE_IMAGE,
                location: findUser.location ?? DEFAULT_LOCATION,
            };

            const existingAccount = await Account.findOne({
                provider,
                providerAccountId: profile.uid,
            });

            if (!existingAccount) {
                await Account.findOneAndUpdate(
                    { provider, providerAccountId: profile.uid },
                    {
                        $setOnInsert: {
                            userId: findUser._id,
                            provider,
                            providerAccountId: profile.uid,
                            type: 'oauth',
                            access_token: tokens.access_token,
                            refresh_token: tokens.refresh_token ?? '',
                            expires_at: tokens.expires_at,
                            token_type: tokens.token_type ?? 'bearer',
                            scope: tokens.scope ?? '',
                            refresh_token_expires_in:
                                tokens.refresh_token_expires_in ?? 0,
                        },
                        $set: {
                            access_token: tokens.access_token,
                            refresh_token: tokens.refresh_token,
                            expires_at: tokens.expires_at,
                        },
                    },
                    { upsert: true, new: true },
                );
            } else {
                await Account.updateOne(
                    { provider, providerAccountId: profile.uid },
                    {
                        $set: {
                            access_token: tokens.access_token,
                            refresh_token: tokens.refresh_token,
                            expires_at: tokens.expires_at,
                        },
                    },
                );
            }
        }

        return result;
    }

    private buildOAuthJwtPayload(
        user: AuthUserPayload,
        tokens: OAuthTokenSet,
        provider: string,
    ): Record<string, unknown> {
        return {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token ?? '',
            accessTokenExpires: tokens.expires_at * 1000,
            id: user.id,
            uid: user.uid,
            name: user.name ?? '',
            profileImage: user.profileImage ?? DEFAULT_PROFILE_IMAGE,
            role: user.role ?? 'newUser',
            isActive: user.isActive ?? false,
            provider,
        };
    }

    async loginKakao(
        code: string,
        redirectUri: string,
    ): Promise<AuthLoginResponseDto> {
        const tokens = await this.oauthAuthService.exchangeKakaoCode(
            code,
            redirectUri,
        );
        const profile = await this.oauthAuthService.fetchKakaoProfile(
            tokens.access_token,
        );
        const user = await this.processOAuthSignIn('kakao', profile, tokens);
        const jwtPayload = this.buildOAuthJwtPayload(user, tokens, 'kakao');
        return this.buildLoginResponse(jwtPayload, user);
    }

    async loginApple(
        code: string,
        redirectUri: string,
    ): Promise<AuthLoginResponseDto> {
        const tokens = await this.oauthAuthService.exchangeAppleCode(
            code,
            redirectUri,
        );

        if (!tokens.id_token) {
            throw new UnauthorizedException('Apple id_token이 없습니다.');
        }

        const appleProfile = this.oauthAuthService.parseAppleIdToken(
            tokens.id_token,
        );

        const profile: AuthUserPayload = {
            id: appleProfile.sub,
            uid: appleProfile.sub,
            name: appleProfile.email ?? 'Apple User',
            role: 'newUser',
            isActive: false,
            profileImage: DEFAULT_PROFILE_IMAGE,
            email: appleProfile.email,
        };

        const user = await this.processOAuthSignIn('apple', profile, tokens);
        const jwtPayload = this.buildOAuthJwtPayload(user, tokens, 'apple');
        return this.buildLoginResponse(jwtPayload, user);
    }

    async getSession(accessToken: string): Promise<AuthSessionDto> {
        const decoded = await decode({
            token: accessToken,
            secret: this.getJwtSecret(),
        });

        if (!decoded) {
            throw new UnauthorizedException('유효하지 않은 토큰입니다.');
        }

        const sessionUser: AuthUserPayload = {
            id: String(decoded.id ?? ''),
            uid: String(decoded.uid ?? ''),
            name: String(decoded.name ?? ''),
            role: String(decoded.role ?? 'newUser'),
            isActive: Boolean(decoded.isActive),
            profileImage: String(decoded.profileImage ?? ''),
            location: DEFAULT_LOCATION,
        };

        return this.buildSession(sessionUser);
    }

    async refreshSession(accessToken: string): Promise<AuthLoginResponseDto> {
        let token = (await decode({
            token: accessToken,
            secret: this.getJwtSecret(),
        })) as JWT | null;

        if (!token) {
            throw new UnauthorizedException('유효하지 않은 토큰입니다.');
        }

        const provider = (token as JWT & { provider?: string }).provider ?? 'kakao';

        if (
            token.accessTokenExpires &&
            Date.now() < Number(token.accessTokenExpires)
        ) {
            const sessionUser: AuthUserPayload = {
                id: String(token.id ?? ''),
                uid: String(token.uid ?? ''),
                name: String(token.name ?? ''),
                role: String(token.role ?? 'newUser'),
                isActive: Boolean(token.isActive),
                profileImage: String(token.profileImage ?? ''),
            };
            return this.buildLoginResponse(token as Record<string, unknown>, sessionUser);
        }

        try {
            token = await this.oauthAuthService.refreshAccessToken(token, provider);
        } catch {
            return this.buildLoginResponse(
                { ...token, error: 'RefreshAccessTokenError' },
                {
                    id: String(token.id ?? ''),
                    uid: String(token.uid ?? ''),
                    name: String(token.name ?? ''),
                    role: String(token.role ?? 'newUser'),
                    isActive: Boolean(token.isActive),
                    profileImage: String(token.profileImage ?? ''),
                },
            );
        }

        const sessionUser: AuthUserPayload = {
            id: String(token.id ?? ''),
            uid: String(token.uid ?? ''),
            name: String(token.name ?? ''),
            role: String(token.role ?? 'newUser'),
            isActive: Boolean(token.isActive),
            profileImage: String(token.profileImage ?? ''),
        };

        return this.buildLoginResponse(token as Record<string, unknown>, sessionUser);
    }
}
