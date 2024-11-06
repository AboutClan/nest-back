const os = require('os');
const winston = require('winston');
const winstonDaily = require('winston-daily-rotate-file');
require('winston-syslog');
require('winston-mongodb');
// const process = require("process");

const { combine, timestamp, label, printf } = winston.format;

//* 로그 파일 저장 경로 → 루트 경로/logs 폴더
const logDir = `${process.cwd()}/logs`;

//* log 출력 포맷 정의 함수
const logFormat = printf(({ level, message, label, timestamp }: any) => {
  return `${timestamp} [${label}] ${level}: ${message}`; // 날짜 [시스템이름] 로그레벨 메세지
});

/*
 * Log Level
 * error: 0, warn: 1, info: 2, http: 3, verbose: 4, debug: 5, silly: 6
 */

const mongoDBTransport = new winston.transports.MongoDB({
  db: process.env.MONGODB_URI,
  collection: 'logs',
});

export const logger = winston.createLogger({
  format: winston.format.simple(),
  levels: winston.config.syslog.levels,
  transports: [mongoDBTransport],
});

export const getLogsFromMongoDB = async () => {
  try {
    const logs = await mongoDBTransport.query({}, { limit: 10, order: 'desc' });

    return logs;
  } catch (error) {
    console.error('로그 가져오기 실패:', error);
  }
};
