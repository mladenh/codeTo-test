"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
require('dotenv').config();
const minLogLevel = process.env.LOG || 'info';
exports.logger = winston_1.default.createLogger({
    level: minLogLevel,
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
    transports: [
        new winston_1.default.transports.Stream({
            stream: process.stdout,
        }),
    ],
});
//# sourceMappingURL=logger.js.map