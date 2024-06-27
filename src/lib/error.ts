/**
 * Server Error
 */
export class ServerError extends Error {
  code: string;
  status: number;
  /**
   * Constructor
   * @param {string} message Error Message
   * @param {string} code Application Error Code
   * @param {number} status HTTP Status Code
   */
  constructor(message: string, code: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
    Error.captureStackTrace(this, ServerError);
  }

  /**
   * Returns the correct JSON format for Errors
   * @return {Object} formatted error response
   */
  getErrorBodyJson() {
    return {
      code: this.code,
      message: this.message,
    };
  }
}

/**
 * TransientError any HTTP 5xx Error
 */
export class TransientError extends ServerError {
  /**
   * Constructor
   * @param {string} message Error Message
   * @param {string} code application error code
   */
  constructor(message: string, code: string) {
    super(message, code, 500);
  }
}

/**
 * PermanentError any HTTP 4xx Error
 */
export class PermanentError extends ServerError {
  /**
   * Constructor
   * @param {string} message Error Message
   * @param {string} code application error code
   */
  constructor(message: string, code: string) {
    super(message, code, 400);
  }
}

/**
 *  Request Error
 */
export class RequestError extends PermanentError {
  /**
   * Constructor
   * @param {string} message Error text to be displayed
   */
  constructor(message = '-') {
    super(`invalid request to ${message}`, 'SERVICE001');
  }
}

/**
 *
 */
export class ProfileNotFoundError extends Error {
  /**
   *
   */
  constructor(message: string) {
    super(message);
    this.name = 'ProfileNotFoundError';
    // Maintain proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ProfileNotFoundError);
    }
  }
}
