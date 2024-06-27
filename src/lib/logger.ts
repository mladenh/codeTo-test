import winston from 'winston';
require('dotenv').config();

const minLogLevel = process.env.LOG || 'info';

export const logger = winston.createLogger({
  level: minLogLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.Stream({
      stream: process.stdout,
    }),
  ],
});
