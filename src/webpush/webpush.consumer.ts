// webpush.consumer.ts
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import PushNotifications from 'node-pushnotifications';
import { ConfigService } from '@nestjs/config';

@Processor('webpushQ')
export class WebPushConsumer {
  private settings: any;

  constructor(private readonly configService: ConfigService) {
    const publicKey = this.configService.get<string>('PUBLIC_KEY');
    const privateKey = this.configService.get<string>('PRIVATE_KEY');

    this.settings = {
      web: {
        vapidDetails: {
          subject: 'mailto:alsrhks0503@gmail.com',
          publicKey: publicKey,
          privateKey: privateKey,
        },
        TTL: 86400,
        contentEncoding: 'aes128gcm',
        headers: {},
      },
      android: {
        priority: 'high', // 우선 순위 설정
      },
      isAlwaysUseFCM: true,
    };
  }

  @Process('sendWebpush')
  async sendParallel(job: Job): Promise<any> {
    const { subscriptions, payload } = job.data;

    const limit = 10; // 병렬로 실행할 작업의 최대 개수
    const results: any[] = [];

    // subscriptions 배열을 limit 크기만큼씩 잘라서 실행
    for (let i = 0; i < subscriptions.length; i += limit) {
      const batch = subscriptions.slice(i, i + limit); // 현재 batch만큼 가져오기
      const batchPromises = batch.map(async (subscription) => {
        const push = new PushNotifications(this.settings);
        try {
          await push.send(subscription as any, payload);
          return { status: 'fulfilled' };
        } catch (error) {
          return { status: 'rejected', reason: error };
        }
      });

      // batch의 Promise가 모두 완료될 때까지 대기
      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults);
    }

    this.logForFailure(results);
  }

  //알림 전송 실패한 사람들 로그
  logForFailure = (results: any[]) => {
    const failed = results.filter((result) => result.status === 'rejected');
    failed.forEach((failure, index) => {
      console.error(
        `Error #${index + 1}:`,
        (failure as PromiseRejectedResult).reason,
      );
    });
    return;
  };
}
