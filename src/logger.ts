const winston = require('winston');
require('winston-syslog');
require('winston-mongodb');
// const process = require("process");

const { printf } = winston.format;

/*
 * Log Level
 * error: 0, warn: 1, info: 2, http: 3, verbose: 4, debug: 5, silly: 6
 */
const mongoDBTransport = new winston.transports.MongoDB({
  db: process.env.MONGODB_URI,
  collection: 'logs',
  metaKey: 'meta',
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
