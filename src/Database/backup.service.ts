import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import AWS from 'aws-sdk';
import fs from 'fs';
import dayjs from 'dayjs';
import path from 'path';

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private readonly s3: AWS.S3;

  // ✨ ----- [수정] 버킷 이름과 경로(Prefix)를 정확히 분리 ----- ✨
  private readonly BUCKET_NAME = 'studyabout';
  private readonly S3_PREFIX = 'mongodb/';
  // ✨ -------------------------------------------------------- ✨

  constructor() {
    this.s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY,
      secretAccessKey: process.env.AWS_KEY,
      region: 'ap-northeast-2',
    });
  }

  async backupDatabase(): Promise<void> {
    try {
      const DB_URI = process.env.MONGODB_URI;
      const BACKUP_DIR = path.join(process.cwd(), 'backup');
      const DATE_STR = dayjs().format('YYYY-MM-DD_HH-mm-ss');
      const BACKUP_NAME = `backup_${DATE_STR}`;
      const ARCHIVE_PATH = path.join(BACKUP_DIR, `${BACKUP_NAME}.gz`);

      // 1) 디렉토리 준비
      if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
      }

      // 2) mongodump 실행 (압축)
      await this.runCommand(
        `mongodump --uri="${DB_URI}" --archive=${ARCHIVE_PATH} --gzip`,
      );
      this.logger.log(`MongoDB 백업 완료: ${ARCHIVE_PATH}`);

      // 오래된 백업 파일 삭제 로직
      await this.cleanupOldBackups(3);

      // 3) S3 업로드
      const fileStream = fs.createReadStream(ARCHIVE_PATH);
      const uploadParams = {
        Bucket: this.BUCKET_NAME, // 수정된 BUCKET_NAME 사용
        Key: `${this.S3_PREFIX}${BACKUP_NAME}.gz`,
        Body: fileStream,
      };

      await this.s3.upload(uploadParams).promise();
      this.logger.log('S3 업로드 완료');

      // 4) 로컬 파일 삭제
      fs.unlinkSync(ARCHIVE_PATH);
      this.logger.log('로컬 백업 파일 삭제 완료');
    } catch (error) {
      this.logger.error(`백업 실패: ${error.message}`);
      throw error;
    }
  }

  private async cleanupOldBackups(maxBackups: number): Promise<void> {
    try {
      this.logger.log('S3에서 오래된 백업 파일 확인 중...');
      const listParams = {
        Bucket: this.BUCKET_NAME, // 수정된 BUCKET_NAME 사용
        Prefix: this.S3_PREFIX,
      };

      const listedObjects = await this.s3.listObjectsV2(listParams).promise();

      if (
        !listedObjects.Contents ||
        listedObjects.Contents.length < maxBackups
      ) {
        this.logger.log('삭제할 오래된 백업 파일이 없습니다.');
        return;
      }

      const sortedBackups = listedObjects.Contents.sort((a, b) =>
        a.Key.localeCompare(b.Key),
      );

      const deleteCount = sortedBackups.length - (maxBackups - 1);
      if (deleteCount <= 0) {
        this.logger.log('삭제할 오래된 백업 파일이 없습니다.');
        return;
      }

      const backupsToDelete = sortedBackups.slice(0, deleteCount);

      const deleteParams = {
        Bucket: this.BUCKET_NAME, // 수정된 BUCKET_NAME 사용
        Delete: {
          Objects: backupsToDelete.map(({ Key }) => ({ Key })),
        },
      };

      await this.s3.deleteObjects(deleteParams).promise();
      this.logger.log(
        `S3에서 오래된 백업 ${backupsToDelete.length}개를 삭제했습니다.`,
      );
    } catch (error) {
      this.logger.error(`S3 오래된 백업 삭제 실패: ${error.message}`);
    }
  }

  private runCommand(cmd: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      exec(cmd, (error, stdout, stderr) => {
        if (error) return reject(error);
        this.logger.log(stdout || stderr);
        resolve(true);
      });
    });
  }
}
