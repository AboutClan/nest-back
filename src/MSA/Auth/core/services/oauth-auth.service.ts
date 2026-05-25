import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { JWT } from 'next-auth/jwt';
import { Account } from 'src/MSA/User/entity/account.entity';
import { generateAppleClientSecret } from '../../utils/apple-client-secret.util';

export interface OAuthTokenSet {
    access_token: string;
    id_token?: string;
    refresh_token?: string;
    expires_at: number;
    refresh_token_expires_in?: number;
    token_type?: string;
    scope?: string;
}

@Injectable()
export class OAuthAuthService {
    async exchangeKakaoCode(
        code: string,
        redirectUri: string,
    ): Promise<OAuthTokenSet> {
        const params = new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: process.env.KAKAO_CLIENT_ID as string,
            client_secret: process.env.KAKAO_CLIENT_SECRET as string,
            redirect_uri: redirectUri,
            code,
        });

        const { data } = await axios.post(
            `https://kauth.kakao.com/oauth/token?${params.toString()}`,
            null,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
                },
            },
        );

        return {
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_at: Math.floor(Date.now() / 1000) + (data.expires_in ?? 0),
            refresh_token_expires_in: data.refresh_token_expires_in,
            token_type: data.token_type,
            scope: data.scope,
        };
    }

    async fetchKakaoProfile(accessToken: string) {
        const { data } = await axios.get('https://kapi.kakao.com/v2/user/me', {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        const kakaoAccount = data.kakao_account ?? {};
        const properties = data.properties ?? {};

        return {
            uid: String(data.id),
            id: String(data.id),
            name: kakaoAccount.name || properties.nickname || '카카오사용자',
            role: 'newUser',
            profileImage:
                properties.thumbnail_image ||
                properties.profile_image ||
                '',
            isActive: false,
            email: kakaoAccount.email,
        };
    }

    async exchangeAppleCode(code: string, redirectUri: string): Promise<OAuthTokenSet> {
        const clientSecret = generateAppleClientSecret();
        const params = new URLSearchParams({
            client_id: process.env.APPLE_ID as string,
            client_secret: clientSecret,
            code,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri,
        });

        const { data } = await axios.post(
            'https://appleid.apple.com/auth/token',
            params.toString(),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            },
        );

        return {
            access_token: data.access_token,
            id_token: data.id_token,
            refresh_token: data.refresh_token,
            expires_at: Math.floor(Date.now() / 1000) + (data.expires_in ?? 0),
            token_type: data.token_type,
        };
    }

    parseAppleIdToken(idToken: string): {
        sub: string;
        email?: string;
    } {
        const payload = JSON.parse(
            Buffer.from(idToken.split('.')[1], 'base64url').toString('utf8'),
        );
        return { sub: payload.sub, email: payload.email };
    }

    async refreshAccessToken(
        token: JWT,
        provider: string,
    ): Promise<JWT> {
        if (provider === 'kakao') {
            return this.refreshKakaoToken(token);
        }
        if (provider === 'apple') {
            return this.refreshAppleToken(token);
        }
        return { ...token, error: 'UnsupportedProvider' };
    }

    private async refreshKakaoToken(token: JWT): Promise<JWT> {
        const params = new URLSearchParams({
            client_id: process.env.KAKAO_CLIENT_ID as string,
            client_secret: process.env.KAKAO_CLIENT_SECRET as string,
            grant_type: 'refresh_token',
            refresh_token: token.refreshToken as string,
        });

        const response = await axios.post(
            `https://kauth.kakao.com/oauth/token?${params.toString()}`,
            null,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
                },
            },
        );

        const refreshed = response.data;
        const updateFields = {
            ...(refreshed.access_token && { access_token: refreshed.access_token }),
            ...(refreshed.refresh_token && { refresh_token: refreshed.refresh_token }),
            ...(refreshed.expires_in && {
                expires_at: Math.floor(Date.now() / 1000) + refreshed.expires_in,
            }),
            ...(refreshed.refresh_token_expires_in && {
                refresh_token_expires_in: refreshed.refresh_token_expires_in,
            }),
        };

        await Account.updateMany(
            { providerAccountId: token.uid?.toString() },
            { $set: updateFields },
        );

        return {
            ...token,
            accessToken: refreshed.access_token,
            accessTokenExpires: Date.now() + refreshed.expires_in * 1000,
            refreshToken: refreshed.refresh_token ?? token.refreshToken,
        };
    }

    private async refreshAppleToken(token: JWT): Promise<JWT> {
        const params = new URLSearchParams({
            client_id: process.env.APPLE_ID as string,
            client_secret: generateAppleClientSecret(),
            grant_type: 'refresh_token',
            refresh_token: token.refreshToken as string,
        });

        const response = await axios.post(
            'https://appleid.apple.com/auth/token',
            params.toString(),
            {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            },
        );

        const refreshed = response.data;

        await Account.updateMany(
            { providerAccountId: token.uid?.toString() },
            {
                $set: {
                    access_token: refreshed.access_token,
                    refresh_token: refreshed.refresh_token || token.refreshToken,
                },
            },
        );

        return {
            ...token,
            accessToken: refreshed.access_token,
            accessTokenExpires: Date.now() + refreshed.expires_in * 1000,
            refreshToken: refreshed.refresh_token ?? token.refreshToken,
        };
    }
}
