// backup.js
import { exec } from 'child_process';
import AWS from 'aws-sdk';
import fs from 'fs';
import dayjs from 'dayjs';
import path from 'path';

// AWS S3 설정
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_KEY,
  region: process.env.AWS_REGION,
});

// 환경변수
const DB_URI = process.env.MONGODB_URI;
const BACKUP_DIR = path.join(__dirname, 'backup');
const DATE_STR = dayjs().format('YYYY-MM-DD_HH-mm-ss');
const BACKUP_NAME = `backup_${DATE_STR}`;
const ARCHIVE_PATH = path.join(BACKUP_DIR, `${BACKUP_NAME}.gz`);

// 백업 실행
async function backupDatabase() {
  try {
    // 1) 디렉토리 준비
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR);

    // 2) mongodump 실행 (압축)
    await runCommand(
      `mongodump --uri="${DB_URI}" --archive=${ARCHIVE_PATH} --gzip`,
    );
    console.log('✅ MongoDB 백업 완료:', ARCHIVE_PATH);

    // 3) S3 업로드
    const fileStream = fs.createReadStream(ARCHIVE_PATH);
    const uploadParams = {
      Bucket: process.env.S3_BUCKET_NAME, // 업로드할 S3 버킷
      Key: `mongodb/${BACKUP_NAME}.gz`,
      Body: fileStream,
    };

    await s3.upload(uploadParams).promise();
    console.log('✅ S3 업로드 완료');

    // 4) 로컬 파일 삭제 (선택)
    fs.unlinkSync(ARCHIVE_PATH);
    console.log('🗑️ 로컬 백업 파일 삭제 완료');
  } catch (err) {
    console.error('❌ 백업 실패:', err);
  }
}

// 명령어 실행 helper
function runCommand(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) return reject(error);
      console.log(stdout || stderr);
      resolve(true);
    });
  });
}

// 실행
backupDatabase();
