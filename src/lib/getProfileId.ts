import {logger} from '../lib/logger';
import {ProfileNotFoundError} from './error';
/**
 * Retrieves the profile_id for a given unique_profile_id from the database.
 * @param {string} uniqueProfileId - The unique identifier of the profile to fetch.
 * @param {any} conn - Database connection to use for the query.
 * @returns {Promise<number | null>} - The profile_id if found, or null if not found.
 */
export async function getProfileId(
  uniqueProfileId: string,
  conn: any,
): Promise<number> {
  try {
    const [rows] = await conn.query(
      'SELECT profile_id FROM edoc2.Profile WHERE unique_profile_id = ?',
      [uniqueProfileId],
    );
    if (rows.length === 0) {
      throw new ProfileNotFoundError(
        `Profile not found for ID: ${uniqueProfileId}`,
      );
    }
    return rows[0].profile_id; // Return the first (and should be only) profile_id found
  } catch (err: any) {
    logger.error(`Error fetching profile ID: ${err.message}`);
    throw err; // Re-throw the error to be handled by the caller
  }
}
