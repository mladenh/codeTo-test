#!/usr/bin/env node

/**
 * Module dependencies.
 */
import {app} from '../api';
import http from 'http';
import {ConfigSingleton} from '../lib/config';
const singletonConf = ConfigSingleton.getInstance();
const config = singletonConf.config;

import {logger} from '../lib/logger';

/**
 * Get port from environment and store in Express.
 */
const port = normalizePort(config.api.port || '3000');
app.set('port', port);
console.log('port', port);

/**
 * Create HTTP server.
 */
const server = http.createServer(app);

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
function normalizePort(val: string | number): number | string | boolean {
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
function onError(error: any) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof port === 'string' ? `Pipe ${port}` : `Port ${port}`;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      logger.error(`${bind} requires elevated privileges`);
      throw error;
    case 'EADDRINUSE':
      logger.error(`${bind} is already in use`);
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
  const bind = typeof addr === 'string' ? `pipe ${addr}` : `port ${addr!.port}`;
  logger.debug(`Listening on ${bind}`);
}
