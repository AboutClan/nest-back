import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';
// utils.ts에서 새로 작성한 함수들을 임포트합니다.
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NiceAuthSession } from '../../entity/NiceToken.entity';
import { decryptNiceData, getNiceKeys, verifyIntegrity } from '../../utils';

interface NiceTokenResponse {
  result_code: string;
  result_message: string;
  request_no: string;
  access_token: string;
  expires_in: number;
  token_type: string;
  iterators: number;
  ticket: string;
}

@Injectable()
export class NiceService {
  private readonly clientId = 'NI863690af-2510-4c6f-872d-3eea986a4039';
  private readonly clientSecret =
    'N2RiYmViYTgtNTMyYS00ZmIyLWE3YzUtNDZkODRlZDE4Mzc3MTI1NDk5OUMzQTU2REE0QjA4NDI3RDA1';
  private readonly baseUrl = 'https://auth.niceid.co.kr/ido/intc/v1.0';

  constructor(
    @InjectModel(NiceAuthSession.name)
    private readonly sessionModel: Model<NiceAuthSession>,
  ) {}

  async getAccessToken() {
    try {
      const authHeader = Buffer.from(
        `${this.clientId}:${this.clientSecret}`,
      ).toString('base64');

      const now = new Date();
      const timestamp = now
        .toISOString()
        .replace(/[-T:Z.]/g, '')
        .substring(0, 14);
      const randomStr = crypto.randomBytes(4).toString('hex');
      const requestNo = `REQ${timestamp}${randomStr}`;

      const response = await axios.post<NiceTokenResponse>(
        `${this.baseUrl}/auth/token`,
        {
          grant_type: 'client_credentials',
          request_no: requestNo,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${authHeader}`,
            'X-Intc-DevLang': 'linux/nodejs',
          },
        },
      );

      if (response.data.result_code !== '0000') {
        throw new Error(`NICE API Error: ${response.data.result_message}`);
      }

      return {
        access_token: response.data.access_token,
        ticket: response.data.ticket,
        iterators: response.data.iterators,
        expires_in: response.data.expires_in,
      };
    } catch (error) {
      console.error('NICE Token Error:', error.response?.data || error.message);
      throw new HttpException(
        '인증 토큰 발급 실패',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getAuthUrl(returnUrl?: string, closeUrl?: string) {
    try {
      const tokenData = await this.getAccessToken();

      const now = new Date();
      const timestamp = now
        .toISOString()
        .replace(/[-T:Z.]/g, '')
        .substring(0, 14);
      const randomStr = crypto.randomBytes(4).toString('hex');
      const requestNo = `REQ${timestamp}${randomStr}`;

      const response = await axios.post(
        `${this.baseUrl}/auth/url`,
        {
          request_no: requestNo,
          return_url:
            returnUrl || 'https://study-about.club/nice-auth/callback',
          close_url: closeUrl || 'https://study-about.club/nice-auth/callback',
          svc_types: ['M'],
          method_type: 'GET',
          exp_mods: ['closeButtonOn'],
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tokenData.access_token}`,
            'X-Intc-DevLang': 'linux/nodejs',
          },
        },
      );

      const data = response.data;
      if (data.result_code !== '0000') {
        throw new Error(`NICE URL Error: ${data.result_message}`);
      }

      await this.sessionModel.findOneAndUpdate(
        { request_no: data.request_no },
        {
          request_no: data.request_no,
          ticket: tokenData.ticket,
          iterators: tokenData.iterators,
          transaction_id: data.transaction_id,
          access_token: tokenData.access_token,
        },
        { upsert: true, new: true },
      );

      return {
        auth_url: data.auth_url,
        request_no: data.request_no,
      };
    } catch (error) {
      console.error(
        'NICE Auth URL Error:',
        error.response?.data || error.message,
      );
      throw new HttpException(
        '인증 URL 생성 실패',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getAuthResult(
    accessToken: string, // 컨트롤러에서 받더라도 무시됨
    webTransactionId: string,
    requestNo: string,
  ) {
    try {
      // 1. DB에서 세션 조회
      const session = await this.sessionModel.findOne({
        request_no: requestNo,
      });

      if (!session) {
        console.error(`세션 조회 실패: requestNo(${requestNo})`);
        throw new HttpException(
          '인증 세션을 찾을 수 없습니다',
          HttpStatus.NOT_FOUND,
        );
      }

      // 2. NICE API 결과 호출
      const response = await axios.post(
        `${this.baseUrl}/auth/result`,
        {
          web_transaction_id: webTransactionId, // 프론트에서 받은 원본
          transaction_id: session.transaction_id,
          request_no: session.request_no,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
            'X-Intc-DevLang': 'linux/nodejs',
            client_id: this.clientId,
          },
        },
      );

      const { result_code, result_message, enc_data, integrity_value } =
        response.data;

      if (result_code !== '0000') {
        console.error('NICE API 응답 에러:', response.data);
        throw new Error(
          `NICE Result API Error: ${result_message} (Code: ${result_code})`,
        );
      }

      // 3. 키 생성 (PBKDF2)
      const { symmetricKey, hmacKey } = getNiceKeys(
        session.ticket,
        session.transaction_id,
        session.iterators,
      );

      // 4. 무결성 검증 (hmacKey 사용)
      const isValid = verifyIntegrity(enc_data, hmacKey, integrity_value);
      if (!isValid) throw new Error('데이터 무결성 검증 실패 (위변조 의심)');

      // 5. 복호화 실행 (AES-GCM, symmetricKey 사용)
      const decryptedJson = decryptNiceData(enc_data, symmetricKey);
      const userInfo = JSON.parse(decryptedJson);

      // 6. 완료 후 세션 삭제
      await this.sessionModel.deleteOne({ _id: session._id });

      return userInfo;
    } catch (error) {
      console.error(error);
      if (error.response) {
        console.error(
          'NICE 상세 응답:',
          JSON.stringify(error.response.data, null, 2),
        );
      }
      console.error('NICE Decryption Error:', error.message);

      if (error instanceof HttpException) throw error;
      throw new HttpException(
        '인증 데이터 복호화 실패',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
