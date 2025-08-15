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
      this.logger.log(`✅ MongoDB 백업 완료: ${ARCHIVE_PATH}`);

      // 3) S3 업로드
      const fileStream = fs.createReadStream(ARCHIVE_PATH);
      const uploadParams = {
        Bucket: 'studyabout/mongodb',
        Key: `mongodb/${BACKUP_NAME}.gz`,
        Body: fileStream,
      };

      await this.s3.upload(uploadParams).promise();
      this.logger.log('✅ S3 업로드 완료');

      // 4) 로컬 파일 삭제
      fs.unlinkSync(ARCHIVE_PATH);
      this.logger.log('🗑️ 로컬 백업 파일 삭제 완료');
    } catch (error) {
      this.logger.error(`❌ 백업 실패: ${error.message}`);
      throw error;
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
