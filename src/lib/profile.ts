/* eslint-disable max-len */
import {
  DuplicateProfileError,
  PermanentError,
  RequestError,
  TransientError,
} from './error';
import mariadb from 'mariadb';
import {components} from '../../types';
import {getTypeCode} from './typeHelpers';
/**
 * Checks if a profile with the given profileId exists in the database.
 *
 * @param {mariadb.PoolConnection} conn - The database connection pool connection.
 * @param {string} profileId - The unique identifier of the profile to check.
 */
export async function checkProfileExists(
  conn: mariadb.PoolConnection,
  profileId: string,
): Promise<void> {
  const query =
    'SELECT profile_id FROM edoc2.Profile WHERE unique_profile_id = ?';
  const result = await conn.query(query, [profileId]);
  if (result.length > 0) {
    throw new DuplicateProfileError();
  }
}

/**
 * Inserts a new profile into the 'Profile' table in the database.
 *
 * @param {mariadb.PoolConnection} conn - The database connection pool connection.
 * @param {components['schemas']['eDocProfileCreation']} profileData - The data of the profile to be inserted.
 * @return {Promise<number>} A promise that resolves to the ID of the inserted profile.
 * @throws {DuplicateProfileError} If a profile with the same unique_profile_id already exists.
 */
export async function insertProfile(
  conn: mariadb.PoolConnection,
  profileData: components['schemas']['eDocProfileCreation'],
): Promise<number> {
  const {
    profileId,
    isil,
    projectCode,
    fullTextDeposit,
    '865mCode': subfield_m_code,
    contactEmails,
    isActive,
  } = profileData;
  const insertQuery =
    // eslint-disable-next-line max-len
    'INSERT INTO Profile (unique_profile_id, isil, project_code, full_text_deposit, subfield_m_code, contact_emails, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)';
  const result = await conn.query(insertQuery, [
    profileId,
    isil,
    projectCode,
    fullTextDeposit,
    subfield_m_code,
    JSON.stringify(contactEmails),
    isActive,
  ]);
  return result.insertId;
}

/**
 * Inserts the given types into the Profile_Allowed_Types table for the specified profile.
 *
 * @param {mariadb.PoolConnection} conn - The database connection to use.
 * @param {number} profileId - The ID of the profile.
 * @param {string[]} types - The types to insert.
 * @return {Promise<void>} A promise that resolves when the types have been inserted.
 * @throws {PermanentError} If a type is not found in the Edoc_Content_Types table.
 */
export async function insertProfileAllowedTypes(
  conn: mariadb.PoolConnection,
  profileId: number,
  types: string[],
): Promise<void> {
  const typeCodes = await Promise.all(
    types.map(async (type) => {
      const query =
        'SELECT type_code FROM Edoc_Content_Types WHERE type_name = ?';
      const result = await conn.query(query, [type]);
      if (result.length === 0) {
        throw new PermanentError(`Type '${type}' not found`, 'TYPE_NOT_FOUND');
      }
      return result[0].type_code;
    }),
  );

  await Promise.all(
    typeCodes.map(async (typeCode) => {
      const insertQuery =
        'INSERT INTO Profile_Allowed_Types (profile_id, type_code) VALUES (?, ?)';
      await conn.query(insertQuery, [profileId, typeCode]);
    }),
  );
}

/**
 * Retrieves the allowed types for a specific profile from the database.
 * @param {mariadb.PoolConnection} conn - The database connection.
 * @param {string} profileId - The profile ID for which allowed types are to be fetched.
 * @returns {Promise<string[]>} - An array of allowed type names.
 */
export async function fetchProfileAllowedTypes(
  conn: mariadb.PoolConnection,
  profileId: string,
): Promise<string[]> {
  const query = `
    SELECT ect.type_name
    FROM Profile p
    LEFT JOIN Profile_Allowed_Types pat ON p.Profile_id = pat.profile_id
    LEFT JOIN Edoc_Content_Types ect ON pat.type_code = ect.type_code
    WHERE p.profile_id = ?`;
  const types = await conn.query(query, [profileId]);
  return types.map((type: {type_name: string}) => type.type_name);
}

/**
 * Retrieves the profile ID for a given profile from the database.
 *
 * @param { mariadb.PoolConnection} conn - The database connection.
 * @param {string} profileId - The unique identifier of the profile to retrieve the ID for.
 * @returns {Promise<number>} - The profile ID.
 */
export async function checkProfileExistsAndGetId(
  conn: mariadb.PoolConnection,
  profileId: string,
): Promise<number> {
  const [rows] = await conn.query(
    'SELECT profile_id FROM edoc2.Profile WHERE unique_profile_id = ?',
    [profileId],
  );
  if (!rows || rows.length === 0) {
    throw new PermanentError(
      'The profile to update does not exist.',
      'PROFILE_NOT_FOUND',
    );
  }
  return rows.profile_id;
}

/**
 * Updates the profile information in the database based on the provided update data.
 *
 * @param {mariadb.PoolConnection} conn - The database connection.
 * @param {number} profileId - The unique identifier of the profile to update.
 * @param {components['schemas']['eDocProfile'] } updateData - The data containing the updates for the profile.
 * @return {Promise<void>} - A promise that resolves after updating the profile information.
 */
// eslint-disable-next-line max-len
export async function updateProfileInformation(
  conn: mariadb.PoolConnection,
  profileId: number,
  updateData: components['schemas']['eDocProfile'],
): Promise<void> {
  const filteredUpdateData = filterUpdateData(updateData);
  if (Object.keys(filteredUpdateData).length > 0) {
    const fieldsToUpdate = Object.keys(filteredUpdateData)
      .map((field) => `${field} = ?`)
      .join(', ');
    const values = [...Object.values(filteredUpdateData), profileId];
    await conn.query(
      `UPDATE edoc2.Profile SET ${fieldsToUpdate} WHERE profile_id = ?`,
      values,
    );
  }
}
/**
 * Filters the update data based on the allowed update fields and returns a new object with only the allowed fields.
 *
 * @param {components['schemas']['eDocProfile'] } updateData - The data to be filtered.
 * @return {Partial<components['schemas']['eDocProfile']>} A new object with only the allowed update fields.
 */
export function filterUpdateData(
  updateData: components['schemas']['eDocProfile'],
): Partial<components['schemas']['eDocProfile']> {
  const allowedUpdateFields = [
    'isil',
    'project_code',
    'full_text_deposit',
    'subfield_m_code',
    'contact_emails',
    'is_active',
  ];
  return Object.keys(updateData).reduce(
    (filtered: {[key: string]: any}, key) => {
      if (
        allowedUpdateFields.includes(key) &&
        updateData[key as keyof components['schemas']['eDocProfile']] !==
          undefined
      ) {
        filtered[key] =
          updateData[key as keyof components['schemas']['eDocProfile']];
      }
      return filtered;
    },
    {},
  );
}

/**
 * Updates the allowed types for a profile in the database.
 *
 * @param {mariadb.PoolConnection} conn - The database connection.
 * @param {number} profileId - The ID of the profile.
 * @param {string[]} types - The types to update.
 * @return {Promise<void>} A promise that resolves when the types have been updated.
 */
export async function updateProfileAllowedTypes(
  conn: mariadb.PoolConnection,
  profileId: number,
  types: string[],
): Promise<void> {
  await conn.query('DELETE FROM Profile_Allowed_Types WHERE profile_id = ?', [
    profileId,
  ]);
  for (const type of types) {
    const typeCode = await getTypeCode(type); // This function needs to fetch or validate type codes
    await conn.query(
      'INSERT INTO Profile_Allowed_Types (profile_id, type_code) VALUES (?, ?)',
      [profileId, typeCode],
    );
  }
}

/**
 * Handles update profile errors by checking if the error is an instance of RequestError or PermanentError.
 * If it is, the error is returned as is. Otherwise, a new TransientError is created with a specific message and code.
 *
 * @param {any} err - The error to handle.
 * @return {Error} The error that was handled.
 */
export function handleUpdateProfileError(err: any): Error {
  if (err instanceof RequestError || err instanceof PermanentError) {
    return err;
  }
  return new TransientError(
    'Database error during profile update.',
    'DATABASE_ERROR',
  );
}
