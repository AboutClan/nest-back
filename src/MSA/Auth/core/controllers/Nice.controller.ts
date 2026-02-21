import { Body, Controller, Get, HttpException, HttpStatus, Post, Query } from "@nestjs/common";
import { NiceService } from "../services/Nice.service";

@Controller('auth/nice')
export class NiceContoller {
    constructor(private readonly niceService: NiceService) { }

    /**
   * STEP 1: 인증 시작
   * 프론트엔드에서 '본인인증' 버튼을 누르면 호출합니다.
   */
    @Get('request')
    async requestAuth(
        @Query('returnUrl') returnUrl?: string,
        @Query('closeUrl') closeUrl?: string,
    ) {
        // getAuthUrl 내부에서 1단계(token)와 2단계(url)를 처리하고 DB에 저장까지 완료함
        return await this.niceService.getAuthUrl(returnUrl, closeUrl);
    }

    /**
     * STEP 2: 인증 완료 및 데이터 복호화
     * 팝업창에서 인증 완료 후 받은 web_transaction_id를 가지고 호출합니다.
     */
    @Post('result')
    async getResult(
        @Body('web_transaction_id') webTransactionId: string,
        @Body('request_no') requestNo: string,
    ) {
        if (!webTransactionId || !requestNo) {
            throw new HttpException('필수 파라미터가 누락되었습니다.', HttpStatus.BAD_REQUEST);
        }

        // DB에서 세션을 찾아 NICE API에 최종 결과를 요청하고 복호화된 유저 정보를 반환함
        // 3번째 파라미터 accessToken은 서비스 내부 DB 값을 우선하므로 빈 문자열 전달 가능
        const userInfo = await this.niceService.getAuthResult('', webTransactionId, requestNo);

        // 성공 시 사용자 정보 반환 (이후 JWT 발급이나 회원가입 로직으로 연결)
        return {
            success: true,
            data: userInfo,
        };
    }
}