import pool from './database';
import {PermanentError} from './error';

/**
 * Fetches the type code from the database based on the type name.
 * @param {string} type The name of the type for which the code is needed.
 * @returns {Promise<number>} The type code.
 * @throws {PermanentError} If the type is not found.
 */
export async function getTypeCode(type: string) {
  let conn;
  try {
    conn = await pool.getConnection();
    const result = await conn.query(
      'SELECT type_code FROM Edoc_Content_Types WHERE type_name = ?',
      [type],
    );
    if (result.length > 0) {
      return result[0].type_code;
    } else {
      throw new PermanentError(`Type ${type} not found`, 'TYPE_NOT_FOUND');
    }
  } finally {
    if (conn) {
      await conn.release();
    }
  }
}
