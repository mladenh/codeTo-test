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
  constructor(message: string, code: string, status = 500) {
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
  constructor(message: string, code: string, status = 400) {
    super(message, code, status);
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
    super(`invalid request to ${message}`, 'INVALID_REQUEST', 400);
  }
}

// Specific error for duplicate profile entries
/**
 *
 */
export class DuplicateProfileError extends PermanentError {
  /**
   *
   */
  constructor() {
    super('Profile already exists.', 'PROFILE_EXISTS', 409); // Using 409 Conflict might be more appropriate here
  }
}

// Specific error for resource not found
/**
 *
 */
export class ProfileNotFoundError extends PermanentError {
  /**
   *
   */
  constructor(profileId: string) {
    super(`Profile with ID ${profileId} not found.`, 'PROFILE_NOT_FOUND', 404);
  }
}

/**
 *
 */
export function handleDatabaseError(error: any): never {
  switch (error.code) {
    case 'ER_DUP_ENTRY':
      throw new PermanentError(
        'Duplicate entry for profile',
        'DUPLICATE_ENTRY',
      );
    case 'TYPE_NOT_FOUND':
      throw new PermanentError('Type not found', 'TYPE_NOT_FOUND', 404);
    default:
      throw new TransientError('Database error occurred', 'DATABASE_ERROR');
  }
}

/**
 *
 */
export class ConfirmationRequiredError extends Error {
  /**
   *
   */
  constructor(message = 'Confirmation required for deletion.') {
    super(message);
    this.name = 'ConfirmationRequiredError';
  }
}
