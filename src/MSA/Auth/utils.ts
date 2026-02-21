import * as crypto from 'crypto';

/**
 * [1] 키 유도 함수 (NICE IDO 규격 - PBKDF2)
 * 대칭키와 무결성키를 생성합니다.
 */
export function getNiceKeys(ticket: string, transactionId: string, iterators: number) {
    try {
        // PBKDF2 기반 64바이트(512bit) 키 생성
        const derivedKey = crypto.pbkdf2Sync(ticket, transactionId, iterators, 64, 'sha256');

        let keyString = derivedKey.toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        // 32바이트 대칭키 (Symmetric Key) 추출
        const symmetricKey = keyString.substring(0, 32);
        // 32바이트 무결성 키 (HMAC Key) 추출
        const hmacKey = keyString.substring(48, 48 + 32);

        return { symmetricKey, hmacKey };
    } catch (error) {
        console.error("Key Generation Error:", error.message);
        throw error;
    }
}

/**
 * [2] 무결성 검증 함수
 */
export function verifyIntegrity(encData: string, hmacKey: string, receivedIntegrity: string): boolean {
    const hmac = crypto.createHmac('sha256', hmacKey);
    const hashValue = hmac.update(encData).digest();

    const calculatedIntegrity = hashValue.toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    return calculatedIntegrity === receivedIntegrity;
}

/**
 * [3] AES-256-GCM 복호화 함수
 */
export function decryptNiceData(encData: string, symmetricKey: string): string {
    try {
        const cipherEnc = Buffer.from(
            encData.replace(/-/g, '+').replace(/_/g, '/'),
            'base64'
        );

        // IV(초기벡터) 추출: 앞 16바이트
        const iv = cipherEnc.slice(0, 16);
        // 인증 태그 추출: 뒤 16바이트
        const tag = cipherEnc.slice(cipherEnc.length - 16);
        // 실제 암호문: 중간 데이터
        const cipherText = cipherEnc.slice(16, cipherEnc.length - 16);

        const decipher = crypto.createDecipheriv(
            'aes-256-gcm',
            Buffer.from(symmetricKey, 'utf8'),
            iv
        );
        decipher.setAuthTag(tag);

        const decrypted = Buffer.concat([
            decipher.update(cipherText),
            decipher.final()
        ]);

        return decrypted.toString('utf8');
    } catch (error) {
        console.error("AES GCM Decryption Error:", error.message);
        throw new Error("데이터 복호화 실패");
    }
}