#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Module dependencies.
 */
const api_1 = require("../api");
const http_1 = __importDefault(require("http"));
const config_1 = require("../lib/config");
const singletonConf = config_1.ConfigSingleton.getInstance();
const config = singletonConf.config;
const logger_1 = require("../lib/logger");
/**
 * Get port from environment and store in Express.
 */
const port = normalizePort(config.api.port || '3000');
api_1.app.set('port', port);
console.log('port', port);
/**
 * Create HTTP server.
 */
const server = http_1.default.createServer(api_1.app);
/**
 * Listen on provided port, on all network interfaces.
 */
server.listen(port);
server.on('error', onError);
server.on('listening', onListening);
/**
 * Normalize a port into a number, string, or false.
 * @param {int} val
 * @return {int} or boolean
 */
function normalizePort(val) {
    const port = parseInt(val.toString(), 10);
    if (isNaN(port)) {
        // named pipe
        return val;
    }
    if (port >= 0) {
        // port number
        return port;
    }
    return false;
}
/**
 * Event listener for HTTP server "error" event.
 * @param {object} error
 */
function onError(error) {
    if (error.syscall !== 'listen') {
        throw error;
    }
    const bind = typeof port === 'string' ? `Pipe ${port}` : `Port ${port}`;
    // handle specific listen errors with friendly messages
    switch (error.code) {
        case 'EACCES':
            logger_1.logger.error(`${bind} requires elevated privileges`);
            throw error;
        case 'EADDRINUSE':
            logger_1.logger.error(`${bind} is already in use`);
            throw error;
        default:
            throw error;
    }
}
/**
 * Event listener for HTTP server "listening" event.
 */
function onListening() {
    const addr = server.address();
    const bind = typeof addr === 'string' ? `pipe ${addr}` : `port ${addr.port}`;
    logger_1.logger.debug(`Listening on ${bind}`);
}
//# sourceMappingURL=www.js.map