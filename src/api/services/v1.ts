import {
  PermanentError,
  ServerError,
  TransientError,
  RequestError,
  handleDatabaseError,
  ProfileNotFoundError,
  ConfirmationRequiredError,
} from '../../lib/error';
import {logger} from '../../lib/logger';
import {Options} from '../../lib/objects';
import pool from '../../lib/database';
import {getAlmaConnection, fetchBibFromAlma} from '../../lib/almaApiHelpers';
import jwt from 'jsonwebtoken';
import {decomposeObjectID} from '../../lib/idUtils';
import path from 'path';
import fs from 'fs';
import {getTypeCode} from '../../lib/typeHelpers';
import {getProfileId} from '../../lib/getProfileId';
import {hashPassword} from '../../lib/HashPassword';
import {components, operations} from '../../../types';
import mariadb from 'mariadb';
import {
  checkProfileExists,
  fetchProfileAllowedTypes,
  insertProfile,
  insertProfileAllowedTypes,
  checkProfileExistsAndGetId,
  updateProfileInformation,
  updateProfileAllowedTypes,
  handleUpdateProfileError,
} from '../../lib/profile';

const SECRET_KEY = 'yourSecretKeyHere'; //TODO: Move this to an environment variable?

/**
 * Creates an eDoc profile based on the provided options.
 * @param {Options} options - The options object containing the profile data.
 * @returns {Promise<{status: number, data: any}>} The response object.
 */
export async function createEDocProfile(options: {
  body: components['schemas']['eDocProfileCreation'];
}): Promise<{data: any; status: number}> {
  //
  let conn: mariadb.PoolConnection | null = null;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    await checkProfileExists(conn, options.body.profileId);
    const profileId = await insertProfile(conn, options.body);
    await insertProfileAllowedTypes(
      conn,
      profileId,
      options.body.profileAllowedTypes,
    );

    await conn.commit();

    return {
      status: 201,
      data: {
        ...options.body,
        '865mCode': options.body['865mCode'],
        isActive: options.body.isActive,
      },
    };
  } catch (err: unknown) {
    if (conn) await conn.rollback();
    throw err; // Rethrow the error
  } finally {
    if (conn) conn.release();
  }
}

/**
 * Retrieves an eDoc profile by profileId.
 * @param {Options} options - The options object containing the query parameters.
 * @param {String} options.profileId - the unique identifier of the profile
 * @throws {Error}
 * @returns {Promise<{status: number, data: any}>} - The result object with status and data.
 */
export async function getEDocProfile(
  options: operations['getEDocProfile']['parameters']['path'],
): Promise<{status: number; data: components['schemas']['eDocProfile']}> {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(
      'SELECT * FROM edoc2.Profile \
      WHERE unique_profile_id = ?',
      [options.profileId],
    );

    if (rows.length > 0) {
      const profile = rows[0];
      const responseData: components['schemas']['eDocProfile'] = {
        profileId: profile.unique_profile_id,
        isil: profile.isil,
        projectCode: profile.project_code,
        fullTextDeposit: !!profile.full_text_deposit, // Convert to boolean
        '865mCode': profile.subfield_m_code,
        contactEmails: profile.contact_emails
          ? JSON.parse(profile.contact_emails)
          : [],
        profileAllowedTypes: (await fetchProfileAllowedTypes(
          conn,
          profile.profile_id,
        )) as (
          | 'Inhaltsverzeichnis'
          | 'Klappentext'
          | 'Volltext'
          | 'Umschlagbild'
          | 'Bild'
        )[],
        isActive: !!profile.is_active,
      };
      return {status: 200, data: responseData};
    } else {
      throw new ProfileNotFoundError(options.profileId);
    }
  } catch (err) {
    if (err instanceof ServerError) {
      throw err;
    } else {
      throw new TransientError(
        'An unexpected error occurred while retrieving profile',
        'UNEXPECTED_ERROR',
      );
    }
  } finally {
    if (conn) conn.release();
  }
}

/**
 * Updates an eDoc profile based on the provided profileId and update data.
 * @param {Options} options - Contains the profileId and update data in the body.
 * @returns {Promise<{status: number, data: any}>}
 */
export async function updateEDocProfile(options: {
  profileId: components['parameters']['profileId'];
  profileData: components['schemas']['eDocProfile'];
}): Promise<{status: number; data: any}> {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const {profileId, profileData} = options;

    const profileAllowedTypes = profileData.profileAllowedTypes; // Capture allowed types before any modification
    delete profileData.profileAllowedTypes; // Remove from the main update object

    // Check for profile existence and get internal profile_id
    const profile_Id = await checkProfileExistsAndGetId(conn, profileId);

    // Update profile information
    await updateProfileInformation(conn, profile_Id, profileData);

    // Handle allowed types if provided
    if (profileAllowedTypes) {
      await updateProfileAllowedTypes(conn, profile_Id, profileAllowedTypes);
    }
    await conn.commit();
    return {status: 204, data: {message: 'Profile updated successfully.'}};
  } catch (err) {
    if (conn) await conn.rollback();
    throw handleUpdateProfileError(err);
  } finally {
    if (conn) await conn.release();
  }
}

/**
 * @param {Object} options
 * @param {String} options.profileId the id of the eDocprofile
 * @param {Boolean} options.confirm confirm the deletion
 * @throws {Error}
 * @returns {Promise<{status: number, data: any}>}
 */
export async function deleteEDocProfile(
  options: operations['deleteEDocProfile']['parameters'],
): Promise<{data: any; status: number}> {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const profileId = options.path.profileId;

    // Verify that deletion is confirmed if required by business logic
    if (!options.query.confirm) {
      throw new ConfirmationRequiredError();
    }
    // Attempt to delete related entries safely with a subquery
    await conn.query(
      'DELETE FROM edoc2.Profile_Allowed_Types WHERE profile_id IN (SELECT profile_id FROM Profile WHERE unique_profile_id = ?)',
      [profileId],
    );

    // Delete the main profile entry
    const queryResult = await conn.query(
      'DELETE FROM edoc2.Profile WHERE unique_profile_id = ?',
      [profileId],
    );

    if (queryResult.affectedRows === 0) {
      await conn.rollback();
      throw new ProfileNotFoundError(profileId);
    }

    await conn.commit();
    return {status: 204, data: {message: 'Profile deleted successfully.'}}; // No content to return on successful deletion
  } catch (err) {
    if (conn) await conn.rollback();

    if (err instanceof ProfileNotFoundError || err instanceof ServerError) {
      throw err;
    }

    logger.error('Error deleting profile:', err);
    throw new TransientError(
      'An unexpected error occurred while deleting profile',
      'UNEXPECTED_ERROR',
    );
  } finally {
    if (conn) {
      conn.release();
    }
  }
}


/**
 * Retrieves a list of eDoc profiles based on provided search criteria.
 * @param {Options} options - Contains the filter for the query.
 * @param {String} options.eDocprofileQuery Filters the list of eDoc profiles based on the provided search criteria.
 * @returns {Promise<{status: number, data: any}>}
 */
export async function listEDocProfiles(
  options: components['parameters']['searchProfileQuery'],
// eslint-disable-next-line max-len
): Promise<operations['listEDocProfiles']['responses'][200] | operations['listEDocProfiles']['responses'][400] | operations['listEDocProfiles']['responses'][500]>{
  let conn;
  try {
    conn = await pool.getConnection();

    const sqlSelect = `
      SELECT p.unique_profile_id, p.isil, p.project_code, p.full_text_deposit, 
             p.subfield_m_code, p.contact_emails, p.is_active, 
             GROUP_CONCAT(DISTINCT ect.type_name SEPARATOR ', ') AS profileAllowedTypes
    `;
    const sqlFrom = 'FROM edoc2.Profile p';
    const sqlJoin = `
      LEFT JOIN Profile_Allowed_Types pat ON p.profile_id = pat.profile_id 
      LEFT JOIN Edoc_Content_Types ect ON pat.type_code = ect.type_code
    `;
    const sqlGroupBy = 'GROUP BY p.profile_id';

    let sqlWhere = '';
    const params: any = [];
    const whereConditions: string[] = [];

    // Build the WHERE clause based on provided filters
    Object.keys(options.query).forEach((key) => {
      if (key === 'profile_allowed_types' && queryData[key].length > 0) {
        const placeholders = queryData[key].map(() => '?').join(',');
        whereConditions.push(`ect.type_name IN (${placeholders})`);
        params.push(...queryData[key]);
      } else if (key !== 'profile_allowed_types') {
        whereConditions.push(`p.${key} = ?`);
        params.push(queryData[key]);
      }
    });

    if (whereConditions.length > 0) {
      sqlWhere = ' WHERE ' + whereConditions.join(' AND ');
    }

    const sqlQuery = `${sqlSelect} ${sqlFrom} ${sqlJoin} ${sqlWhere} ${sqlGroupBy}`;

    const rows = await conn.query(sqlQuery, params);

    const formattedResults = rows.map((row: any) => ({
      profileId: row.unique_profile_id,
      isil: row.isil,
      projectCode: row.project_code,
      fullTextDeposit: row.full_text_deposit === 1,
      '865mCode': row.subfield_m_code,
      contactEmails: row.contact_emails ? JSON.parse(row.contact_emails) : [],
      profileAllowedTypes: row.profileAllowedTypes
        ? row.profileAllowedTypes.split(', ')
        : [],
      isActive: row.is_active === 1,
    }));

    return {status: 200, data: formattedResults};
  } catch (err) {
    logger.error(err);
    throw new TransientError('Failed to query database', 'DB_FAIL');
  } finally {
    if (conn) await conn.release();
  }
}

/**
 * Registers a new user with the provided user details.
 * @param {Options} options - Contains the user details for registration.
 * @returns {Promise<{status: number, data: any}>}
 */
export async function registerUser(
  options: Options,
): Promise<{status: number; data: any}> {
  let conn: any;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction(); //start transaction

    const {
      first_name,
      last_name,
      username,
      email,
      user_type,
      password,
      eDocProfiles,
      is_active,
    } = options.body;

    // Check if user already exists
    const existingUserResult = await conn.query(
      'SELECT 1 FROM edoc2.User WHERE email = ?',
      [email],
    );
    if (existingUserResult.length > 0) {
      throw new PermanentError('Email already exists.', 'EMAIL_EXISTS');
    }

    const hashedPassword = await hashPassword(password);

    // Prepare and execute the INSERT query for user
    // eslint-disable-next-line max-len
    const insertResult = await conn.query(
      'INSERT INTO User (first_name, last_name, username, email, user_type, password_hash, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        first_name,
        last_name,
        username,
        email,
        user_type,
        hashedPassword,
        is_active ? 1 : 0,
      ],
    );

    // Get the inserted user ID
    const userId = insertResult.insertId.toString();
    //convert from BigInt to int
    const userIdInt = parseInt(userId);

    // Resolve profile IDs for the given unique_profile_ids
    if (eDocProfiles && eDocProfiles.length > 0) {
      const profileIds = await Promise.all(
        eDocProfiles.map(async (uniqueProfileId: string) => {
          const profiles = await conn.query(
            'SELECT profile_id FROM edoc2.Profile \
            WHERE unique_profile_id = ?',
            [uniqueProfileId],
          );
          return profiles.length ? profiles[0].profile_id : null;
        }),
      );

      // Filter out any null values (non-nd aexistent profiles)
      const validProfileIds = profileIds.filter((id) => id !== null);

      // Insert valid profiles into User_Profile one by one
      for (const profileId of validProfileIds) {
        await conn.query(
          'INSERT INTO edoc2.User_Profile (user_id, profile_id) VALUES (?, ?)',
          [userIdInt, profileId],
        );
      }
    }
    await conn.commit(); // Commit the transaction
    // Successfully registered
    return {status: 201, data: {message: 'User successfully registered'}};
  } catch (err: any) {
    // Log the error internally
    logger.error('Failed to register user: ' + err.message, {
      error: err,
      data: options.body,
    });
    throw new TransientError('Internal server error', 'SERVER_ERROR');
  } finally {
    if (conn) await conn.release();
  }
}

/**
 * Logs in a user based on the provided username.
 * @param {Object} options
 * @throws {Error}
 * @return {Promise}
 */
export async function loginUser(options: Options): Promise<any> {
  try {
    const {username} = options.body;

    const conn = await pool.getConnection();
    const query = 'SELECT * FROM User WHERE username = ? LIMIT 1';
    const users = await conn.query(query, [username]);
    await conn.release();

    if (users.length === 0) {
      return {status: 401, data: {error: 'Invalid username'}};
    }

    const user = users[0];

    /*     if (user.password !== password) {
      return {status: 401, data: {error: 'Invalid password'}};
    } */

    // If authentication is successful, generate a JWT
    const token = jwt.sign({userId: user.id}, SECRET_KEY, {expiresIn: '1h'});

    return {status: 200, data: {token}};
  } catch (err) {
    logger.error(err);
    return {status: 500, data: {error: 'Internal server error'}};
  }
}

/**
 * Updates user details based on the provided username and update data.
 * @param {Options} options - Contains the username and the update data in the body.
 * @returns {Promise<{status: number, data: any}>}
 */
export async function updateUser(
  options: Options,
): Promise<{status: number; data: any}> {
  let conn: any;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const {username, body: updateData} = options;

    // Validate and fetch user
    const [users] = await conn.query(
      'SELECT user_id FROM edoc2.User WHERE username = ?',
      [username],
    );
    if (!users || users.length === 0)
      throw new PermanentError('User not found', 'USER_NOT_FOUND');
    const userId = users.user_id;

    // Process password if present, then remove from updateData
    if (updateData.password) {
      updateData.password_hash = await hashPassword(updateData.password);
      delete updateData.password;
    }

    // Remove eDocProfiles from updateData to handle it separately
    const eDocProfiles = updateData.eDocProfiles;
    delete updateData.eDocProfiles;

    // Filter and prepare fields for SQL update
    const fieldsToUpdate = Object.keys(updateData)
      .filter((key) => updateData[key] !== undefined && key !== 'password_hash') // Exclude password_hash if it's handled separately
      .map((key) => `${key} = ?`)
      .join(', ');
    if (fieldsToUpdate.length === 0) {
      throw new PermanentError('No data provided for update', 'NO_UPDATE_DATA');
    }

    const valuesToUpdate = Object.keys(updateData)
      .filter((key) => updateData[key] !== undefined && key !== 'password_hash')
      .map((key) => updateData[key]);

    // Execute the update query
    // Update user details if there are fields to update
    if (fieldsToUpdate.length > 0) {
      await conn.query(
        `UPDATE edoc2.User SET ${fieldsToUpdate} WHERE user_id = ?`,
        [...valuesToUpdate, userId],
      );
    }
    if (conn.affectedRows === 0) {
      throw new PermanentError('Update operation failed', 'UPDATE_FAILED');
    }

    // if password is hash, update it
    if (updateData.password_hash) {
      await conn.query(
        'UPDATE edoc2.User SET password_hash = ? WHERE user_id = ?',
        [updateData.password_hash, userId],
      );
    }

    // Update User_Profile association
    if (eDocProfiles && eDocProfiles.length > 0) {
      await conn.query('DELETE FROM User_Profile WHERE user_id = ?', [userId]);
      const profileIds = await Promise.all(
        eDocProfiles.map((profile: string) => getProfileId(profile, conn)),
      );
      const inserts = profileIds.map((id) => [userId, id]);
      await conn.query(
        'INSERT INTO User_Profile (user_id, profile_id) VALUES ?',
        [inserts],
      );
    }

    await conn.commit();

    return {status: 200, data: {message: 'User updated successfully.'}};
  } catch (err: any) {
    await conn!.rollback();
    logger.error(`Error updating profile: ${err.message}`);
    throw new TransientError(
      'Database error during user update.',
      'DATABASE_ERROR',
    );
  } finally {
    if (conn) await conn.release();
  }
}

/**
 * Deletes a user based on the provided username.
 * @param {Options} options - Contains the username of the user to be deleted.
 * @returns {Promise<{status: number, data: any}>}
 */
export async function deleteUser(
  options: Options,
): Promise<{status: number; data: any}> {
  let conn;
  try {
    const {username, confirm} = options;
    if (!confirm) {
      throw new PermanentError(
        'Deletion must be confirmed.',
        'CONFIRMATION_REQUIRED',
      );
    }

    conn = await pool.getConnection();
    await conn.beginTransaction();

    // Delete user-profile associations first
    const delProfileAssoc = await conn.query(
      'DELETE FROM edoc2.User_Profile WHERE user_id = (SELECT user_id FROM edoc2.User WHERE username = ?)',
      [username],
    );

    if (delProfileAssoc.affectedRows === 0) {
      return {status: 404, data: {error: 'The user does not exist.'}};
    }

    // Then delete the user
    const delUser = await conn.query(
      'DELETE FROM edoc2.User WHERE username = ?',
      [username],
    );

    if (delUser.affectedRows === 0) {
      return {status: 404, data: {error: 'The user does not exist.'}};
    }

    await conn.commit();

    // Successfully deleted
    return {status: 200, data: {message: 'User successfully deleted.'}};
  } catch (err) {
    await conn!.rollback();
    logger.error(`Error deleting user: ${err}`);
    throw new TransientError('Failed to delete user', 'DELETE_FAIL');
  } finally {
    if (conn) await conn.release();
  }
}

/**
 * Retrieves the profile information for a specified user.
 * @param {Options} options - Contains the username of the user.
 * @returns {Promise<{status: number, data: any}>}
 */
export async function getUser(
  options: Options,
): Promise<{status: number; data: any}> {
  let conn;
  try {
    conn = await pool.getConnection();
    const {username} = options;

    const userQuery =
      'SELECT user_id, first_name, last_name, username, user_type, email, is_active FROM edoc2.User WHERE username = ?';
    const userResult = await conn.query(userQuery, [username]);

    if (userResult.length === 0) {
      throw new PermanentError('Profile not found', 'NOT_FOUND');
    }

    const userProfileQuery = `
    SELECT up.profile_id, p.unique_profile_id
    FROM edoc2.User_Profile up
    JOIN edoc2.Profile p ON up.profile_id = p.profile_id
    WHERE up.user_id = ?
  `;
    const profileResult = await conn.query(userProfileQuery, [
      userResult[0].user_id,
    ]);
    const eDocProfiles = profileResult.map(
      (profile: {unique_profile_id: any}) => profile.unique_profile_id,
    );

    const user = userResult[0];
    const formattedResult = {
      firstName: user.first_name,
      lastName: user.last_name,
      username: user.username,
      userType: user.user_type,
      email: user.email,
      eDocProfiles: eDocProfiles,
      isActive: !!user.is_active,
    };

    // Successfully retrieved user profile
    return {status: 200, data: formattedResult};
  } catch (err) {
    logger.error(`Error fetching user profile: ${err}`);
    throw new TransientError('Internal server error', 'SERVER_ERROR');
  } finally {
    if (conn) await conn.release();
  }
}

/**
 * Lists users based on provided search criteria.
 * @param {Options} options - Contains filtering criteria.
 * @returns {Promise<{status: number, data: any}>}
 */
export async function listUsers(
  options: Options,
): Promise<{status: number; data: any}> {
  let conn;
  try {
    conn = await pool.getConnection();
    const queryData: any = options.query;

    const sqlSelect = `SELECT first_name, last_name, username, email, user_type, u.is_active, 
        GROUP_CONCAT(DISTINCT p.unique_profile_id ORDER BY p.unique_profile_id SEPARATOR ', ') AS eDocProfiles
      `;

    const sqlFrom = 'FROM edoc2.User u';
    const sqlJoin = `
      LEFT JOIN edoc2.User_Profile up ON u.user_id = up.user_id
      LEFT JOIN edoc2.Profile p ON up.profile_id = p.profile_id`;
    const sqlGroupBy = `
    GROUP BY u.user_id
    `;

    let sqlWhere = '';
    const params: any[] = [];
    const whereConditions: string[] = [];

    // Iterate over the query parameters and construct the WHERE clause
    Object.entries(queryData).forEach(([key, value]) => {
      if (value !== undefined) {
        const dbField = `u.${key}`; // Always prepend 'u.' to ensure it targets columns from the User table
        if (key === 'is_active') {
          value = value === 'true' || value === true ? 1 : 0; // Proper conversion to match the database's understanding of booleans
        }
        whereConditions.push(`${dbField} = ?`);
        params.push(value);
      }
    });

    if (whereConditions.length > 0) {
      sqlWhere += ' WHERE ' + whereConditions.join(' AND ');
    }

    const sqlQuery = `${sqlSelect} ${sqlFrom} ${sqlJoin} ${sqlWhere} ${sqlGroupBy}`;

    const users = await conn.query(sqlQuery, params);

    // This transformation is needed to align the raw SQL output to the expected API output
    const formattedResults = users.map((user: any) => ({
      firstName: user.first_name,
      lastName: user.last_name,
      username: user.username,
      email: user.email,
      userType: user.user_type,
      isActive: !!user.is_active,
      eDocProfiles: user.eDocProfiles.split(', '),
    }));

    return {status: 200, data: formattedResults};
  } catch (err) {
    logger.error(`Error listing users: ${err}`);
    throw new TransientError('Internal server error', 'DB_FAIL');
  } finally {
    if (conn) await conn.release();
  }
}

/**
 * Creates a new object in the database with the specified properties.
 * @param {Options} options - Contains the object data.
 * @returns {Promise<{status: number, data: any}>}
 */
export async function createObject(
  options: Options,
): Promise<{status: number; data: any}> {
  let conn;
  try {
    const {body} = options;
    const {
      ac_number,
      profile,
      object_type_name,
      label,
      belongs_to_aggregate,
      file_url,
    } = body;

    // Check AC number exists in Alma
    const almaConnection = getAlmaConnection();
    conn = await pool.getConnection();
    const almaBib = await fetchBibFromAlma(ac_number, almaConnection);
    if (!almaBib) {
      return {status: 404, data: {error: 'AC number not found in Alma.'}};
    }

    // Retrieve profile_id based on profile identifier
    const profileResult = await conn.query(
      'SELECT profile_id FROM edoc2.Profile WHERE unique_profile_id = ?',
      [profile],
    );
    if (profileResult.length === 0) {
      return {status: 404, data: {error: 'Profile identifier not found.'}};
    }
    const profile_id = profileResult[0].profile_id;

    // Retrieve object type code based on type name
    const typeResult = await conn.query(
      'SELECT type_code FROM edoc2.Edoc_Content_Types WHERE type_name = ?',
      [object_type_name],
    );
    if (typeResult.length === 0) {
      return {status: 404, data: {error: 'Object type not found.'}};
    }
    const object_type = typeResult[0].type_code;

    // Retrieve the next sequence number
    const sequenceResult =
      // eslint-disable-next-line max-len
      await conn.query(
        'SELECT MAX(sequence_number) AS max_sequence FROM edoc2.Edoc_Content WHERE ac_number = ? AND object_type = ?',
        [ac_number, object_type],
      );
    const sequence_number = sequenceResult[0].max_sequence
      ? String(Number(sequenceResult[0].max_sequence) + 1).padStart(2, '0')
      : '01';

    const query =
      // eslint-disable-next-line max-len
      'INSERT INTO edoc2.Edoc_Content (ac_number, profile_id, sequence_number, object_type, mime_id, label, belongs_to_aggregate, size, file_path, create_date, update_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())';
    const result = await conn.query(query, [
      ac_number,
      profile_id,
      sequence_number,
      object_type,
      null, // mime_id left empty for now
      label,
      belongs_to_aggregate,
      null, // size left empty for now
      file_url,
      null, // file_path left empty for now
    ]);

    if (result.affectedRows > 0) {
      return {
        status: 201,
        data: {
          message: 'Object created successfully.',
          objectId: result.insertId.toString(),
        },
      };
    } else {
      return {status: 400, data: {error: 'Failed to create object.'}};
    }
  } catch (err) {
    logger.error(`Error creating object: ${err}`);
    return {status: 500, data: {error: 'Internal server error'}};
  } finally {
    if (conn) await conn.release();
  }
}

/**
 * Searches for objects in the database based on provided search criteria.
 * @param {Options} options - Contains the query parameters for searching.
 * @returns {Promise<{status: number, data: any}>}
 */
export async function searchObjects(
  options: Options,
): Promise<{status: number; data: any}> {
  let conn;
  try {
    conn = await pool.getConnection();

    // Ensure the query object exists or default to an empty object
    const query = options.query || {};
    const {
      acnr,
      isil,
      profile,
      sequence,
      objectType,
      belongsToAggregate,
      label,
      dateRange,
      fileName,
      sortBy = 'ac_number', // Default sorting field
      sortOrder = 'asc', // Default sorting order
      page = 1,
      limit = 10,
    } = query;

    // eslint-disable-next-line max-len
    let sqlQuery = `SELECT c.object_id, c.ac_number, p.unique_profile_id, c.sequence_number, ect.type_name, m.mime_type, c.belongs_to_aggregate, c.label, c.file_name,
      c.size, c.create_date, c.update_date
      FROM edoc2.Edoc_Content c
      JOIN edoc2.Edoc_Content_Types ect ON c.object_type = ect.type_code
      JOIN edoc2.Profile p ON p.profile_id = c.profile_id
      JOIN edoc2.Mime_Types m ON c.mime_id = m.mime_id`;
    const queryParams: any[] = [];

    const whereConditions: string[] = [];
    if (acnr) whereConditions.push('c.ac_number = ?') && queryParams.push(acnr);
    if (isil) whereConditions.push('p.isil = ?') && queryParams.push(isil);
    if (profile)
      whereConditions.push('p.unique_profile_id = ?') &&
        queryParams.push(profile);
    if (sequence)
      whereConditions.push('c.sequence_number = ?') &&
        queryParams.push(sequence);
    if (objectType)
      whereConditions.push('c.object_type = ?') && queryParams.push(objectType);
    // eslint-disable-next-line max-len
    if (belongsToAggregate !== undefined)
      whereConditions.push('c.belongs_to_aggregate = ?') &&
        queryParams.push(belongsToAggregate ? 1 : 0);
    if (label) whereConditions.push('c.label = ?') && queryParams.push(label);
    if (dateRange)
      whereConditions.push('c.create_date BETWEEN ? AND ?') &&
        queryParams.push(...dateRange);
    if (fileName)
      whereConditions.push('c.file_path LIKE ?') &&
        queryParams.push(`%${fileName}%`);

    if (whereConditions.length)
      sqlQuery += ` WHERE ${whereConditions.join(' AND ')}`;

    // Add ORDER BY and pagination
    const sort = `${sortBy} ${sortOrder}`;
    sqlQuery += ` ORDER BY ${sort}`;
    const offset = (page - 1) * limit;
    sqlQuery += ' LIMIT ?, ?';
    queryParams.push(offset, limit);

    const objects = await conn.query(sqlQuery, queryParams);

    //transformation is needed to align the raw sql output with the expected API output
    const formattedResults = objects.map((object: any) => ({
      id: object.object_id,
      acnr: object.ac_number,
      profile: object.unique_profile_id,
      sequence: object.sequence_number,
      objectType: object.type_name,
      mimeType: object.mime_type,
      belongsToAggregate: object.belongs_to_aggregate === 1 ? true : false,
      label: object.label,
      fileName: object.file_name,
      size: object.size,
      createDate: object.create_date,
      updateDate: object.update_date,
    }));

    return {status: 200, data: formattedResults};
  } catch (err) {
    logger.error(`Error searching objects: ${err}`);
    return {status: 500, data: {error: 'Internal server error'}};
  } finally {
    if (conn) await conn.release();
  }
}

/**
 * Deletes all objects associated with a given AC number from the database.
 * @param {Options} options - Contains the AC number and confirmation flag.
 * @returns {Promise<{status: number, data: any}>}
 */
export async function deleteObjects(
  options: Options,
): Promise<{status: number; data: any}> {
  let conn;
  try {
    const {acnr, confirm} = options;

    if (!acnr) {
      return {status: 400, data: {error: 'ACNR is required.'}};
    }

    if (!confirm) {
      return {status: 400, data: {error: 'Deletion must be confirmed.'}};
    }

    conn = await pool.getConnection();
    const result = await conn.query(
      'DELETE FROM Edoc_Content WHERE ac_number = ?',
      [acnr],
    );

    if (result.affectedRows === 0) {
      return {
        status: 404,
        data: {error: 'Objects not found or already deleted.'},
      };
    }

    return {status: 200, data: {message: 'Objects deleted successfully.'}};
  } catch (err) {
    logger.error(`Error deleting objects: ${err}`);
    return {status: 500, data: {error: 'Internal server error'}};
  } finally {
    if (conn) await conn.release();
  }
}

/**
 * Retrieves a specific object from the database based on the given criteria.
 * @param {Options} options - Contains criteria for object retrieval.
 * @returns {Promise<{status: number, data: any}>}
 *
 */
export async function getObjectMetadata(options: {
  acnr: string;
  acRecordObjectId: string;
}): Promise<{status: number; data: any}> {
  let conn;
  try {
    conn = await pool.getConnection();
    const {acnr, acRecordObjectId} = options;

    if (!acnr || !acRecordObjectId) {
      return {status: 400, data: {error: 'Missing required parameters'}};
    }
    const {type, sequence, isNumericType} = decomposeObjectID(acRecordObjectId);

    // Construct query condition based on type being mnemonic or numeric
    // eslint-disable-next-line max-len
    const typeCondition = isNumericType
      ? 'object_type = ?'
      : 'object_type = (SELECT type_code FROM edoc2.Edoc_Content_Types WHERE mnemonic = ?)';

    const query = `
    SELECT c.object_id, c.ac_number, 
    p.unique_profile_id, c.sequence_number, 
    ect.type_name, m.mime_type, c.belongs_to_aggregate, 
    c.label, c.file_name,
    c.size, c.create_date, c.update_date
      FROM edoc2.Edoc_Content c
      JOIN edoc2.Edoc_Content_Types ect ON c.object_type = ect.type_code
      JOIN edoc2.Profile p ON p.profile_id = c.profile_id
      JOIN edoc2.Mime_Types m ON c.mime_id = m.mime_id
    WHERE ac_number = ? AND
    ${typeCondition} AND 
    sequence_number = ?`;

    const params = isNumericType
      ? [acnr, type, sequence]
      : [acnr, type, sequence];
    const queryResult = await conn.query(query, params);

    if (queryResult.length === 0) {
      return {status: 404, data: {error: 'Object not found.'}};
    }
    const formattedResult = queryResult.map((object: any) => ({
      id: object.object_id,
      acnr: object.ac_number,
      profile: object.unique_profile_id,
      sequence: object.sequence_number,
      objectType: object.type_name,
      mimeType: object.mime_type,
      belongsToAggregate: object.belongs_to_aggregate === 1 ? true : false,
      label: object.label,
      fileName: object.file_name,
      size: object.size,
      createDate: object.create_date,
      updateDate: object.update_date,
      links: [
        {
          rel: 'self',
          href: `/v1/api/catalog/${acnr}/objects/${acRecordObjectId}`,
        },
        {
          rel: 'delete',
          href: `/v1/api/catalog/${acnr}/objects/${acRecordObjectId}`,
        },
        {
          rel: 'data',
          href: `/v1/api/catalog/${acnr}/objects/${acRecordObjectId}/data`,
        },
      ],
    }));

    return {status: 200, data: formattedResult[0]}; // Return the first object found
  } catch (err) {
    logger.error(`Error retrieving object: ${err}`);
    return {status: 500, data: {error: 'Internal server error'}};
  } finally {
    if (conn) await conn.release();
  }
}

/**
 * @param {Object} options
 * @param {String} options.acnr the acnr of the object
 * @param {String} options.acRecordObjectId the acRecordObjectId of the object
 * @param {Object} options.updateFields the fields to update
 * @throws {Error}
 * @return {Promise}
 */
export async function updateObjectmetadata(options: Options): Promise<any> {
  let conn: any;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const {acnr, acRecordObjectId, body} = options;
    const {type, sequence, isNumericType} = decomposeObjectID(
      acRecordObjectId!,
    );

    // Initialize typeCode with type if it's numeric, otherwise fetch the code from the database
    let typeCode = type;
    if (!isNumericType) {
      const typeCodeResult = await conn.query(
        'SELECT type_code FROM edoc2.Edoc_Content_Types WHERE mnemonic = ?',
        [type],
      );
      if (typeCodeResult.length === 0) {
        throw new PermanentError('Object type not found', 'TYPE_NOT_FOUND');
      }
      typeCode = typeCodeResult[0].type_code;
    }

    // Check for sequence conflicts if sequence is updated
    if (body.sequence && body.sequence !== sequence) {
      const existingSequence = await conn.query(
        'SELECT 1 FROM edoc2.Edoc_Content WHERE ac_number = ? AND object_type = ? AND sequence_number = ?',
        [acnr, type, body.sequence],
      );
      if (existingSequence.length > 0) {
        throw new PermanentError(
          'Sequence number already exists for this AC number and type',
          'SEQUENCE_EXISTS',
        );
      }
    }

    // Prepare fields for update
    const fieldsToUpdate: string[] = [];
    const valuesToUpdate: unknown[] = [];
    Object.entries(body).forEach(([key, value]) => {
      // Avoid changing identifiers directly
      fieldsToUpdate.push(`${key} = ?`);
      valuesToUpdate.push(value);
    });

    // Adding the current date and time to the update_date field
    fieldsToUpdate.push('update_date = NOW()');

    const updateQuery = `
      UPDATE edoc2.Edoc_Content
      SET ${fieldsToUpdate.join(', ')}
      WHERE ac_number = ? AND object_type = ? AND sequence_number = ?;
    `;
    const result = await conn.query(updateQuery, [
      ...valuesToUpdate,
      acnr,
      typeCode,
      sequence,
    ]);

    if (result.affectedRows === 0) {
      throw new PermanentError(
        'Object not found or no changes applied',
        'OBJECT_NOT_FOUND',
      );
    }

    await conn.commit();
    return {status: 204, data: {message: 'Object updated successfully.'}};
  } catch (err) {
    await conn.rollback();
    logger.error(`Error updating object: ${err}`);
    if (err instanceof ServerError) {
      throw err;
    } else {
      throw new TransientError(
        'Internal server error during update',
        'UPDATE_FAIL',
      );
    }
  } finally {
    if (conn) conn.release();
  }
}

/**
 * Deletes a specific object from the database based on given criteria.
 * @param {Options} options - Contains criteria for object deletion and a confirmation flag.
 * @returns {Promise<{status: number, data: any}>}
 */
export async function deleteObjectMetadata(
  options: Options,
): Promise<{status: number; data: any}> {
  let conn;
  try {
    conn = await pool.getConnection();
    const {acnr, acRecordObjectId, confirm} = options;

    if (!confirm) {
      return {status: 400, data: {error: 'Deletion must be confirmed.'}};
    }
    // Ensure acRecordObjectId is a string
    const acRecordObjectIdString = acRecordObjectId || '';

    // Decompose acRecordObjectId to determine if it's a mnemonic or type code
    const {type, sequence, isNumericType} = decomposeObjectID(
      acRecordObjectIdString,
    );

    // eslint-disable-next-line max-len
    const typeCondition = isNumericType
      ? 'object_type = ?'
      : 'object_type = (SELECT type_code FROM edoc2.Edoc_Content_Types WHERE mnemonic = ?)';

    const query = `
      DELETE FROM edoc2.Edoc_Content
      WHERE ac_number = ? AND 
            ${typeCondition} AND 
            sequence_number = ?;
    `;
    const queryResult = await conn.query(query, [acnr, type, sequence]);

    if (queryResult.affectedRows === 0) {
      throw new PermanentError('Object not found.', 'OBJECT_NOT_FOUND');
    }

    return {status: 200, data: {message: 'Object deleted successfully.'}};
  } catch (err) {
    if (conn) {
      await conn.rollback();
    }
    if (err instanceof ServerError) {
      throw err;
    }
    throw new TransientError(
      'Internal server error during deletion.',
      'DELETE_FAIL',
    );
  } finally {
    if (conn) {
      await conn.release();
    }
  }
}

/**
 * @param {Object} options
 * @param {String} options.acnr the acnr of the object
 * @param {String} options.acRecordObjectId the acRecordObjectId of the object
 * @throws {Error}
 * @return {Promise}
 */
export async function fetchObjectData(
  options: Options,
): Promise<{status: number; data: any}> {
  let conn;
  try {
    conn = await pool.getConnection();
    const {acnr, acRecordObjectId} = options;

    // Ensure acRecordObjectId is a string
    const acRecordObjectIdString = acRecordObjectId || '';

    const {type, sequence, isNumericType} = decomposeObjectID(
      acRecordObjectIdString,
    );
    const typeCondition = isNumericType
      ? 'object_type = ?'
      : 'object_type = (SELECT type_code FROM edoc2.Edoc_Content_Types WHERE mnemonic = ?)';

    const query = `
      SELECT file_name FROM edoc2.Edoc_Content
      WHERE ac_number = ? AND 
            sequence_number = ? AND 
            ${typeCondition};
    `;

    const params = [acnr, sequence, type];
    const result = await conn.query(query, params);
    console.log(result);

    if (result.length === 0) {
      return {status: 404, data: 'File not found'};
    }

    const filePath = result[0].file_name;
    console.log(filePath);
    if (!filePath) {
      return {status: 404, data: 'File path is empty'};
    }

    return {status: 200, data: filePath};
  } catch (err) {
    logger.error(`Error fetching object data: ${err}`);
    return {status: 500, data: 'Internal server error'};
  } finally {
    if (conn) conn.release();
  }
}

/**
 * @param {Object} options
 * @param {String} options.acnr the acnr of the object
 * @param {String} options.acRecordObjectId the acRecordObjectId of the object
 * @throws {Error}
 * @return {Promise}
 */
export async function uploadObjectData(options: Options) {
  let conn;
  try {
    conn = await pool.getConnection();
    const {acnr, acRecordObjectId, file} = options;
    if (!file) {
      throw new Error('File is undefined');
    }

    const {type, sequence, isNumericType} = decomposeObjectID(
      acRecordObjectId || '',
    );
    let checkQuery =
      'SELECT * FROM Edoc_Content WHERE ac_number = ? AND sequence_number = ?';
    const queryParams = [acnr, sequence];

    if (isNumericType) {
      checkQuery += ' AND object_type = ?';
      queryParams.push(type);
    } else {
      checkQuery +=
        ' AND object_type = (SELECT type_code FROM Edoc_Content_Types WHERE mnemonic = ?)';
      queryParams.push(type);
    }

    const checkResult = await conn.query(checkQuery, queryParams);

    if (checkResult.length === 0) {
      throw new PermanentError('Object not found', 'OBJECT_NOT_FOUND');
    }
    //modification to extract only the part of file path
    const relativeFilePath = `/${path.basename(file.path)}`;

    const updateQuery =
      // eslint-disable-next-line max-len
      'UPDATE Edoc_Content SET file_path = ?, size = ?, update_date = NOW(), file_name = ? WHERE ac_number = ? AND sequence_number = ? AND object_type = ?';
    await conn.query(updateQuery, [
      relativeFilePath,
      file.size,
      file.filename,
      acnr,
      sequence,
      type,
    ]);
    await conn.commit();
    return {status: 200, data: 'File updated successfully'};
  } catch (err) {
    if (conn) {
      await conn.rollback();
    }
    logger.error(`Error uploading object data: ${err}`);
    if (err instanceof ServerError || err instanceof PermanentError) {
      throw err;
    }
    throw new TransientError(
      'Internal server error during file upload',
      'UPDATE_FAIL',
    );
  } finally {
    if (conn) conn.release();
  }
}

/**
 * @param {Object} options
 * @param {String} options.acnr the acnr of the object
 * @param {String} options.acRecordObjectId the acRecordObjectId of the object
 * @param {Boolean} options.confirm confirm the deletion
 * @throws {Error}
 * @return {Promise}
 */
export async function deleteObjectData(options: Options) {
  let conn;

  try {
    conn = await pool.getConnection();
    const {acnr, acRecordObjectId} = options;

    //Decompose acRecordObjectId to determine type and sequence
    const {type, sequence, isNumericType} = decomposeObjectID(
      acRecordObjectId || '',
    );
    // eslint-disable-next-line max-len
    const typeCondition = isNumericType
      ? 'object_type = ?'
      : 'object_type = (SELECT type_code FROM edoc2.Edoc_Content_Types WHERE mnemonic = ?)';

    //Retrieve file_name from Edoc_Content and delete the file
    const query = `
      SELECT file_name FROM edoc2.Edoc_Content
      WHERE ac_number = ? AND sequence_number = ? AND ${typeCondition};
    `;
    const fileResult = await conn.query(query, [acnr, sequence, type]);
    if (fileResult.length === 0) {
      return {status: 404, data: 'Object not found'};
    }

    const filePath = fileResult[0].file_name;
    if (filePath) {
      //check if file exists before deleting
      const fullPath = path.join(__dirname, '../../public/data', filePath);

      logger.debug(`Deleting file at: ${fullPath}`);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath); //delete file
        logger.info(`Deleted file: ${fullPath}`);
      } else {
        logger.warn(`File not found: ${fullPath}`);
      }
    }

    //Delete object from Edoc_Content
    const deleteQuery = `
      DELETE FROM edoc2.Edoc_Content
      WHERE ac_number = ? AND sequence_number = ? AND ${typeCondition};
    `;
    const deleteResult = await conn.query(deleteQuery, [acnr, sequence, type]);
    if (deleteResult.affectedRows === 0) {
      return {status: 404, data: 'Failed to delete  database record'};
    }
    return {status: 200, data: 'Object data deleted successfully'};
  } catch (err) {
    logger.error(`Error deleting object data: ${err}`);
    return {status: 500, data: 'Internal server error'};
  } finally {
    if (conn) conn.release();
  }
}

/**
 * @param {Object} options
 * @param {String} options.acnr AC Number identifying the object.
 * @param {String} options.object_type Type of the object to be delivered.
 * @param {String} options.sequence Sequence number of the object,
 *  determining its order among multiple objects associated with the same AC number.
 * @throws {Error}
 * @return {Promise}
 */
export async function directDelivery(options: Options): Promise<any> {
  try {
    const {acnr, object_type, sequence} = options; //objectType is just added for type checking
    const conn = await pool.getConnection();

    const query = `
      SELECT file_path FROM edoc.Edoc_Content
      WHERE ac_number = ? AND object_type = ? AND sequence_number = ?
      LIMIT 1
    `;
    const rows = await conn.query(query, [acnr, object_type, sequence]);
    conn.release();

    if (rows.length === 0) {
      return {status: 404, data: {error: 'Object not found.'}};
    }

    const filePath = rows[0].file_path;
    //  `filePath` is a path relative to a public or accessible directory
    return {status: 200, data: {filePath}};
  } catch (err) {
    console.error(`Error during direct delivery: ${err}`);
    return {status: 500, data: {error: 'Internal server error'}};
  }
}

/**
 * @param {Object} options
 * @param {String} options.acnr the acnr of the object
 * @param {String} options.profile creator of the object
 * @param {String} options.sequence the sequence of the object
 * @param {String} options.modifier the modifier of the object
 * @throws {Error}
 * @return {Promise}
 */
export async function createFullTextCache(options: Options): Promise<any> {
  let result;
  try {
    result = {status: 400, data: 'TODO: implement'}; //await processRequestv1(options);
  } catch (err: any) {
    logger.error(err);
    return {
      status: err.status || 500,
      data: err.message || 'Default Error',
    };
  }
  return {
    status: result.status || 200,
    data: result.data || '',
  };
}

/**
 * @param {Object} options
 * @param {String} options.acnr the acnr of the object
 * @param {String} options.profile creator of the object
 * @param {String} options.modifier the modifier of the object
 * @param {String} options.sequence the sequence of the object
 * @throws {Error}
 * @return {Promise}
 */
export async function getFullTextCache(options: Options): Promise<any> {
  let result;
  try {
    result = {status: 400, data: 'TODO: implement'}; //await processRequestv1(options);
  } catch (err: any) {
    logger.error(err);
    return {
      status: err.status || 500,
      data: err.message || 'Default Error',
    };
  }
  return {
    status: result.status || 200,
    data: result.data || '',
  };
}

/**
 * @param {Object} options
 * @param {String} options.acnr the acnr of the object
 * @param {String} options.profile creator of the object
 * @param {String} options.modifier the modifier of the object
 * @param {String} options.sequence the sequence of the object
 * @throws {Error}
 * @return {Promise}
 */
export async function rebuildFullTextCache(options: Options): Promise<any> {
  let result;
  try {
    result = {status: 400, data: 'TODO: implement'}; //await processRequestv1(options);
  } catch (err: any) {
    logger.error(err);
    return {
      status: err.status || 500,
      data: err.message || 'Default Error',
    };
  }
  return {
    status: result.status || 200,
    data: result.data || '',
  };
}

/**
 * @param {Object} options
 * @throws {Error}
 * @return {Promise}
 */
export async function extendPnxWithFullText(options: Options): Promise<any> {
  let result;
  try {
    result = {status: 400, data: 'TODO: implement'}; //await processRequestv1(options);
  } catch (err: any) {
    logger.error(err);
    return {
      status: err.status || 500,
      data: err.message || 'Default Error',
    };
  }
  return {
    status: result.status || 200,
    data: result.data || '',
  };
}

/**
 * @param {Object} options
 * @param {Integer} options.userIdQuery the userId of the user
 * @param {String} options.timeRange the time range of the report
 * @param {String} options.activityType the activity type of the report
 * @throws {Error}
 * @return {Promise}
 */
export async function generateUserReport(options: Options): Promise<any> {
  let result;
  try {
    result = {status: 400, data: 'TODO: implement'}; //await processRequestv1(options);
  } catch (err: any) {
    logger.error(err);
    return {
      status: err.status || 500,
      data: err.message || 'Default Error',
    };
  }
  return {
    status: result.status || 200,
    data: result.data || '',
  };
}

/**
 * @param {Object} options
 * @param {String} options.profileId ID of the profile
 * @param {String} options.timeRange Time range for the statistics (e.g., &#x27;total&#x27; or &#x27;lastMonth&#x27;)
 * @param {String} options.objectType Specific object type to filter the statistics
 * @throws {Error}
 * @return {Promise}
 */
export async function getContributionsStats(options: Options): Promise<any> {
  let result;
  try {
    result = {status: 400, data: 'TODO: implement'}; //await processRequestv1(options);
  } catch (err: any) {
    logger.error(err);
    return {
      status: err.status || 500,
      data: err.message || 'Default Error',
    };
  }
  return {
    status: result.status || 200,
    data: result.data || '',
  };
}

/**
 * @param {Object} options
 * @param {String} options.profileId The profile to filter the statistics by.
 * @throws {Error}
 * @return {Promise}
 */
export async function getWebAccessesStats(options: Options): Promise<any> {
  let result;
  try {
    result = {status: 400, data: 'TODO: implement'}; //await processRequestv1(options);
  } catch (err: any) {
    logger.error(err);
    return {
      status: err.status || 500,
      data: err.message || 'Default Error',
    };
  }
  return {
    status: result.status || 200,
    data: result.data || '',
  };
}
