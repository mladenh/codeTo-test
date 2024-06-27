"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// lib/database.ts
const mariadb_1 = __importDefault(require("mariadb"));
const config_1 = __importDefault(require("config"));
// Load database configuration from the config module
const dbConfig = config_1.default.get('db');
const pool = mariadb_1.default.createPool({
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
    connectionLimit: dbConfig.connectionLimit,
});
exports.default = pool;
//# sourceMappingURL=database.js.map