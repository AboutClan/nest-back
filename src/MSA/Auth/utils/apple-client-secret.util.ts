import * as jwt from 'jsonwebtoken';

/** NextAuth generateClientSecret() 와 동일 */
export function generateAppleClientSecret(): string {
    const privateKey = (process.env.APPLE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n');
    const now = Math.floor(Date.now() / 1000);

    return jwt.sign(
        {
            iss: process.env.APPLE_TEAM_ID,
            iat: now,
            exp: now + 3600,
            aud: 'https://appleid.apple.com',
            sub: process.env.APPLE_ID,
        },
        privateKey,
        {
            algorithm: 'ES256',
            header: {
                alg: 'ES256',
                kid: process.env.APPLE_KEY_ID,
            },
        },
    );
}
