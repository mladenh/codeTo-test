"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileNotFoundError = exports.RequestError = exports.PermanentError = exports.TransientError = exports.ServerError = void 0;
/**
 * Server Error
 */
class ServerError extends Error {
    /**
     * Constructor
     * @param {string} message Error Message
     * @param {string} code Application Error Code
     * @param {number} status HTTP Status Code
     */
    constructor(message, code, status = 400) {
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
exports.ServerError = ServerError;
/**
 * TransientError any HTTP 5xx Error
 */
class TransientError extends ServerError {
    /**
     * Constructor
     * @param {string} message Error Message
     * @param {string} code application error code
     */
    constructor(message, code) {
        super(message, code, 500);
    }
}
exports.TransientError = TransientError;
/**
 * PermanentError any HTTP 4xx Error
 */
class PermanentError extends ServerError {
    /**
     * Constructor
     * @param {string} message Error Message
     * @param {string} code application error code
     */
    constructor(message, code) {
        super(message, code, 400);
    }
}
exports.PermanentError = PermanentError;
/**
 *  Request Error
 */
class RequestError extends PermanentError {
    /**
     * Constructor
     * @param {string} message Error text to be displayed
     */
    constructor(message = '-') {
        super(`invalid request to ${message}`, 'SERVICE001');
    }
}
exports.RequestError = RequestError;
/**
 *
 */
class ProfileNotFoundError extends Error {
    /**
     *
     */
    constructor(message) {
        super(message);
        this.name = 'ProfileNotFoundError';
        // Maintain proper stack trace for where our error was thrown
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ProfileNotFoundError);
        }
    }
}
exports.ProfileNotFoundError = ProfileNotFoundError;
//# sourceMappingURL=error.js.map