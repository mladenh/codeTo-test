"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWebAccessesStats = exports.getContributionsStats = exports.generateUserReport = exports.extendPnxWithFullText = exports.rebuildFullTextCache = exports.getFullTextCache = exports.createFullTextCache = exports.directDelivery = exports.deleteObjectData = exports.uploadObjectData = exports.fetchObjectData = exports.deleteObjectMetadata = exports.updateObjectmetadata = exports.getObjectMetadata = exports.deleteObjects = exports.searchObjects = exports.createObject = exports.listUsers = exports.getUser = exports.deleteUser = exports.updateUser = exports.loginUser = exports.registerUser = exports.listEDocProfiles = exports.deleteEDocProfile = exports.updateEDocProfile = exports.getEDocProfile = exports.createEDocProfile = void 0;
const error_1 = require("../../lib/error");
const logger_1 = require("../../lib/logger");
const database_1 = __importDefault(require("../../lib/database"));
const almaApiHelpers_1 = require("../../lib/almaApiHelpers");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const idUtils_1 = require("../../lib/idUtils");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const typeHelpers_1 = require("../../lib/typeHelpers");
const getProfileId_1 = require("../../lib/getProfileId");
const HashPassword_1 = require("../../lib/HashPassword");
const SECRET_KEY = 'yourSecretKeyHere'; //TODO: Move this to an environment variable?
/**
 * Creates an eDoc profile based on the provided options.
 * @param {Options} options - The options object containing the profile data.
 * @returns {Promise<{status: number, data: any}>} The response object.
 */
function createEDocProfile(options) {
    return __awaiter(this, void 0, void 0, function* () {
        let conn;
        try {
            conn = yield database_1.default.getConnection();
            yield conn.beginTransaction();
            //destructure the new profile data
            const { unique_profile_id, isil, project_code, full_text_deposit, subfield_m_code, contact_emails, profile_allowed_types, is_active, } = options.body;
            //TODO: check if profile already exists
            //insert new profile into edoc2.Profile table
            const result = yield conn.query(`
    INSERT INTO Profile (unique_profile_id, isil, project_code, full_text_deposit, subfield_m_code, contact_emails, is_active) \
    VALUES (?, ?, ?, ?, ?, ?, ?)`, [
                unique_profile_id,
                isil,
                project_code,
                full_text_deposit,
                subfield_m_code,
                JSON.stringify(contact_emails),
                is_active,
            ]);
            //get the newly created profile id
            const profileIdinserted = result.insertId.toString();
            //convert from BigInt to int
            const profileIdInt = parseInt(profileIdinserted);
            //allowed types
            const typeCodes = yield Promise.all(profile_allowed_types.map((type) => __awaiter(this, void 0, void 0, function* () {
                const typeResult = yield conn.query('SELECT type_code FROM Edoc_Content_Types WHERE type_name = ?', [type]);
                if (typeResult.length === 0) {
                    throw new error_1.PermanentError('Type not found', 'TYPE_NOT_FOUND');
                }
                return typeResult[0].type_code;
            })));
            yield Promise.all(typeCodes.map((typeCode) => __awaiter(this, void 0, void 0, function* () {
                yield conn.query('INSERT INTO Profile_Allowed_Types (profile_id, type_code) \
          VALUES (?, ?)', [profileIdInt, typeCode]);
            })));
            yield conn.commit();
            return {
                status: 201,
                data: {
                    message: 'Profile created successfully.',
                    profileId: profileIdinserted,
                },
            };
        }
        catch (err) {
            yield conn.rollback();
            if (err.code === 'ER_DUP_ENTRY') {
                throw new error_1.PermanentError('Duplicate entry for profile', 'DUPLICATE_ENTRY');
            }
            else if (err.message.includes('Type not found')) {
                throw new error_1.PermanentError('Type not found', 'TYPE_NOT_FOUND');
            }
            else {
                throw new error_1.TransientError('Database error occurred', 'DATABASE_ERROR');
            }
        }
        finally {
            if (conn)
                conn.release();
        }
    });
}
exports.createEDocProfile = createEDocProfile;
/**
 * Retrieves an eDoc profile by profileId.
 * @param {Options} options - The options object containing the query parameters.
 * @param {String} options.profileId - the unique identifier of the profile
 * @throws {Error}
 * @returns {Promise<{status: number, data: any}>} - The result object with status and data.
 */
function getEDocProfile(options) {
    return __awaiter(this, void 0, void 0, function* () {
        let conn;
        try {
            if (!options.profileId) {
                throw new error_1.RequestError('Profile ID is missing');
            }
            conn = yield database_1.default.getConnection();
            const rows = yield conn.query('SELECT * FROM edoc2.Profile \
      WHERE unique_profile_id = ?', [options.profileId]);
            //get profile allowed types
            const profileAllowedTypes = yield conn.query(
            // eslint-disable-next-line max-len
            'SELECT ect.type_name from Profile p \
      LEFT JOIN Profile_Allowed_Types pat on p.Profile_id = pat.profile_id \
      LEFT JOIN Edoc_Content_Types ect on pat.type_code = ect.type_code \
      WHERE p.unique_profile_id = ?', [options.profileId]);
            if (rows.length > 0) {
                const profile = rows[0];
                const responseData = {
                    profileId: profile.unique_profile_id,
                    isil: profile.isil,
                    projectCode: profile.project_code,
                    fullTextDeposit: !!profile.full_text_deposit, // Convert to boolean
                    '865mCode': profile.subfield_m_code,
                    contactEmails: profile.contact_emails
                        ? JSON.parse(profile.contact_emails)
                        : [],
                    profileAllowedTypes: profileAllowedTypes.map((type) => type.type_name), // Convert to array
                    isActive: !!profile.is_active,
                };
                return { status: 200, data: responseData };
            }
            else {
                throw new error_1.PermanentError('Profile not found', 'NOT_FOUND');
            }
        }
        catch (err) {
            if (err instanceof error_1.ServerError) {
                throw err;
            }
            else {
                throw new error_1.TransientError('An unexpected error occurred while retrieving profile', 'UNEXPECTED_ERROR');
            }
        }
        finally {
            if (conn)
                conn.release();
        }
    });
}
exports.getEDocProfile = getEDocProfile;
/**
 * Updates an eDoc profile based on the provided profileId and update data.
 * @param {Options} options - Contains the profileId and update data in the body.
 * @returns {Promise<{status: number, data: any}>}
 */
function updateEDocProfile(options) {
    return __awaiter(this, void 0, void 0, function* () {
        let conn;
        try {
            conn = yield database_1.default.getConnection();
            yield conn.beginTransaction();
            const { profileId, body: updateData } = options;
            //fetch profileId using unique_profile_id
            let rows;
            try {
                [rows] = yield conn.query('SELECT profile_id FROM edoc2.Profile WHERE unique_profile_id = ?', [profileId]);
                if (!rows || rows.length === 0) {
                    throw new error_1.PermanentError('The profile to update does not exist.', 'PROFILE_NOT_FOUND');
                }
            }
            catch (err) {
                logger_1.logger.error(`Database query failed: ${err.message}`);
                throw new error_1.TransientError('Database error occurred while fetching profile ID.', 'DATABASE_ERROR');
            }
            const profile_Id = rows.profile_id;
            const profileAllowedTypes = updateData.profile_allowed_types;
            // Remove allowed types from updateData if present to handle separately
            if (profileAllowedTypes) {
                delete updateData.profileAllowedTypes;
            }
            // Check if necessary data is provided
            if (!profileId ||
                (Object.keys(updateData).length === 0 && !profileAllowedTypes)) {
                throw new error_1.RequestError('Missing profile ID or update data.');
            }
            // Filter updateData to ensure only columns existing in the Profile table are updated
            // eslint-disable-next-line max-len
            const allowedUpdateFields = [
                'isil',
                'project_code',
                'full_text_deposit',
                'subfield_m_code',
                'contact_emails',
                'is_active',
            ];
            const filteredUpdateData = Object.keys(updateData)
                .filter((key) => allowedUpdateFields.includes(key) && updateData[key] !== undefined)
                .reduce((obj, key) => {
                obj[key] = updateData[key];
                return obj;
            }, {});
            // Build SQL query dynamically
            if (Object.keys(filteredUpdateData).length > 0) {
                const fieldsToUpdate = Object.keys(filteredUpdateData)
                    .map((field) => `${field} = ?`)
                    .join(', ');
                const values = [...Object.values(filteredUpdateData), profileId];
                const query = `UPDATE edoc2.Profile SET ${fieldsToUpdate} \
                    WHERE unique_profile_id = ?`;
                const queryResult = yield conn.query(query, values);
                if (queryResult.affectedRows === 0) {
                    throw new error_1.PermanentError('The profile to update does not exist.', 'PROFILE_NOT_FOUND');
                }
            }
            // Handle profileAllowedTypes if present
            if (profileAllowedTypes && profileAllowedTypes.length > 0) {
                // First, clear existing entries
                yield conn.query('DELETE FROM Profile_Allowed_Types \
        WHERE profile_id = ?', [profile_Id]);
                // Insert new entries
                for (const type of profileAllowedTypes) {
                    const typeCode = yield (0, typeHelpers_1.getTypeCode)(type); // Get the type code
                    yield conn.query('INSERT INTO Profile_Allowed_Types (profile_id, type_code) \
          VALUES (?, ?)', [profile_Id, typeCode]);
                }
            }
            yield conn.commit();
            return { status: 200, data: { message: 'Profile updated successfully.' } };
        }
        catch (err) {
            yield conn.rollback();
            logger_1.logger.error(`Error updating profile: ${err.message}`);
            if (err instanceof error_1.RequestError || err instanceof error_1.PermanentError) {
                throw err;
            }
            else {
                throw new error_1.TransientError('Database error during profile update.', 'DATABASE_ERROR');
            }
        }
        finally {
            if (conn)
                yield conn.release();
        }
    });
}
exports.updateEDocProfile = updateEDocProfile;
/**
 * @param {Object} options
 * @param {String} options.profileId the id of the eDocprofile
 * @param {Boolean} options.confirm confirm the deletion
 * @throws {Error}
 * @returns {Promise<{status: number, data: any}>}
 */
function deleteEDocProfile(options) {
    return __awaiter(this, void 0, void 0, function* () {
        // Check if the necessary data is provided
        if (!options.confirm) {
            throw new error_1.PermanentError('Deletion must be confirmed', 'CONFIRMATION_REQUIRED');
        }
        let conn;
        try {
            conn = yield database_1.default.getConnection();
            yield conn.beginTransaction(); // Start transaction
            const profileId = options.profileId;
            if (!profileId) {
                throw new error_1.RequestError('ProfileId is missing');
            }
            // delete related entries from Profile_Allowed_Types
            yield conn.query('DELETE FROM edoc2.Profile_Allowed_Types \
      WHERE profile_id = (SELECT profile_id FROM Profile WHERE unique_profile_id = ?)', [profileId]);
            const queryResult = yield conn.query('DELETE FROM edoc2.Profile WHERE unique_profile_id = ?', [profileId]);
            if (queryResult.affectedRows === 0) {
                yield conn.rollback(); // Rollback transaction
                throw new error_1.PermanentError('The profile does not exist.', 'PROFILE_NOT_FOUND');
            }
            yield conn.commit(); // Commit transaction
            // Successfully deleted, no content to return
            return { status: 204, data: { message: 'Profile deleted successfully.' } };
        }
        catch (err) {
            yield conn.rollback();
            logger_1.logger.error(err);
            if (err instanceof error_1.PermanentError || err instanceof error_1.RequestError) {
                throw err;
            }
            console.error('Error deleting profile:', err);
            throw new error_1.TransientError('Failed to delete the profile due to server error.', 'SERVER_ERROR');
        }
        finally {
            if (conn)
                yield conn.release();
        }
    });
}
exports.deleteEDocProfile = deleteEDocProfile;
/**
 * Retrieves a list of eDoc profiles based on provided search criteria.
 * @param {Options} options - Contains the filter for the query.
 * @param {String} options.eDocprofileQuery Filters the list of eDoc profiles based on the provided search criteria.
 * @returns {Promise<{status: number, data: any}>}
 */
function listEDocProfiles(options) {
    return __awaiter(this, void 0, void 0, function* () {
        let conn;
        try {
            conn = yield database_1.default.getConnection();
            const queryData = options.query;
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
            const params = [];
            const whereConditions = [];
            // Build the WHERE clause based on provided filters
            Object.keys(queryData).forEach((key) => {
                if (key === 'profile_allowed_types' && queryData[key].length > 0) {
                    const placeholders = queryData[key].map(() => '?').join(',');
                    whereConditions.push(`ect.type_name IN (${placeholders})`);
                    params.push(...queryData[key]);
                }
                else if (key !== 'profile_allowed_types') {
                    whereConditions.push(`p.${key} = ?`);
                    params.push(queryData[key]);
                }
            });
            if (whereConditions.length > 0) {
                sqlWhere = ' WHERE ' + whereConditions.join(' AND ');
            }
            const sqlQuery = `${sqlSelect} ${sqlFrom} ${sqlJoin} ${sqlWhere} ${sqlGroupBy}`;
            const rows = yield conn.query(sqlQuery, params);
            const formattedResults = rows.map((row) => ({
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
            return { status: 200, data: formattedResults };
        }
        catch (err) {
            logger_1.logger.error(err);
            throw new error_1.TransientError('Failed to query database', 'DB_FAIL');
        }
        finally {
            if (conn)
                yield conn.release();
        }
    });
}
exports.listEDocProfiles = listEDocProfiles;
/**
 * Registers a new user with the provided user details.
 * @param {Options} options - Contains the user details for registration.
 * @returns {Promise<{status: number, data: any}>}
 */
function registerUser(options) {
    return __awaiter(this, void 0, void 0, function* () {
        let conn;
        try {
            conn = yield database_1.default.getConnection();
            yield conn.beginTransaction(); //start transaction
            const { first_name, last_name, username, email, user_type, password, eDocProfiles, is_active, } = options.body;
            // Check if user already exists
            const existingUserResult = yield conn.query('SELECT 1 FROM edoc2.User WHERE email = ?', [email]);
            if (existingUserResult.length > 0) {
                throw new error_1.PermanentError('Email already exists.', 'EMAIL_EXISTS');
            }
            const hashedPassword = yield (0, HashPassword_1.hashPassword)(password);
            // Prepare and execute the INSERT query for user
            // eslint-disable-next-line max-len
            const insertResult = yield conn.query('INSERT INTO User (first_name, last_name, username, email, user_type, password_hash, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)', [
                first_name,
                last_name,
                username,
                email,
                user_type,
                hashedPassword,
                is_active ? 1 : 0,
            ]);
            // Get the inserted user ID
            const userId = insertResult.insertId.toString();
            //convert from BigInt to int
            const userIdInt = parseInt(userId);
            // Resolve profile IDs for the given unique_profile_ids
            if (eDocProfiles && eDocProfiles.length > 0) {
                const profileIds = yield Promise.all(eDocProfiles.map((uniqueProfileId) => __awaiter(this, void 0, void 0, function* () {
                    const profiles = yield conn.query('SELECT profile_id FROM edoc2.Profile \
            WHERE unique_profile_id = ?', [uniqueProfileId]);
                    return profiles.length ? profiles[0].profile_id : null;
                })));
                // Filter out any null values (non-nd aexistent profiles)
                const validProfileIds = profileIds.filter((id) => id !== null);
                // Insert valid profiles into User_Profile one by one
                for (const profileId of validProfileIds) {
                    yield conn.query('INSERT INTO edoc2.User_Profile (user_id, profile_id) VALUES (?, ?)', [userIdInt, profileId]);
                }
            }
            yield conn.commit(); // Commit the transaction
            // Successfully registered
            return { status: 201, data: { message: 'User successfully registered' } };
        }
        catch (err) {
            // Log the error internally
            logger_1.logger.error('Failed to register user: ' + err.message, {
                error: err,
                data: options.body,
            });
            throw new error_1.TransientError('Internal server error', 'SERVER_ERROR');
        }
        finally {
            if (conn)
                yield conn.release();
        }
    });
}
exports.registerUser = registerUser;
/**
 * Logs in a user based on the provided username.
 * @param {Object} options
 * @throws {Error}
 * @return {Promise}
 */
function loginUser(options) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { username } = options.body;
            const conn = yield database_1.default.getConnection();
            const query = 'SELECT * FROM User WHERE username = ? LIMIT 1';
            const users = yield conn.query(query, [username]);
            yield conn.release();
            if (users.length === 0) {
                return { status: 401, data: { error: 'Invalid username' } };
            }
            const user = users[0];
            /*     if (user.password !== password) {
              return {status: 401, data: {error: 'Invalid password'}};
            } */
            // If authentication is successful, generate a JWT
            const token = jsonwebtoken_1.default.sign({ userId: user.id }, SECRET_KEY, { expiresIn: '1h' });
            return { status: 200, data: { token } };
        }
        catch (err) {
            logger_1.logger.error(err);
            return { status: 500, data: { error: 'Internal server error' } };
        }
    });
}
exports.loginUser = loginUser;
/**
 * Updates user details based on the provided username and update data.
 * @param {Options} options - Contains the username and the update data in the body.
 * @returns {Promise<{status: number, data: any}>}
 */
function updateUser(options) {
    return __awaiter(this, void 0, void 0, function* () {
        let conn;
        try {
            conn = yield database_1.default.getConnection();
            yield conn.beginTransaction();
            const { username, body: updateData } = options;
            // Validate and fetch user
            const [users] = yield conn.query('SELECT user_id FROM edoc2.User WHERE username = ?', [username]);
            if (!users || users.length === 0)
                throw new error_1.PermanentError('User not found', 'USER_NOT_FOUND');
            const userId = users.user_id;
            // Process password if present, then remove from updateData
            if (updateData.password) {
                updateData.password_hash = yield (0, HashPassword_1.hashPassword)(updateData.password);
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
                throw new error_1.PermanentError('No data provided for update', 'NO_UPDATE_DATA');
            }
            const valuesToUpdate = Object.keys(updateData)
                .filter((key) => updateData[key] !== undefined && key !== 'password_hash')
                .map((key) => updateData[key]);
            // Execute the update query
            // Update user details if there are fields to update
            if (fieldsToUpdate.length > 0) {
                yield conn.query(`UPDATE edoc2.User SET ${fieldsToUpdate} WHERE user_id = ?`, [...valuesToUpdate, userId]);
            }
            if (conn.affectedRows === 0) {
                throw new error_1.PermanentError('Update operation failed', 'UPDATE_FAILED');
            }
            // if password is hash, update it
            if (updateData.password_hash) {
                yield conn.query('UPDATE edoc2.User SET password_hash = ? WHERE user_id = ?', [updateData.password_hash, userId]);
            }
            // Update User_Profile association
            if (eDocProfiles && eDocProfiles.length > 0) {
                yield conn.query('DELETE FROM User_Profile WHERE user_id = ?', [userId]);
                const profileIds = yield Promise.all(eDocProfiles.map((profile) => (0, getProfileId_1.getProfileId)(profile, conn)));
                const inserts = profileIds.map((id) => [userId, id]);
                yield conn.query('INSERT INTO User_Profile (user_id, profile_id) VALUES ?', [inserts]);
            }
            yield conn.commit();
            return { status: 200, data: { message: 'User updated successfully.' } };
        }
        catch (err) {
            yield conn.rollback();
            logger_1.logger.error(`Error updating profile: ${err.message}`);
            throw new error_1.TransientError('Database error during user update.', 'DATABASE_ERROR');
        }
        finally {
            if (conn)
                yield conn.release();
        }
    });
}
exports.updateUser = updateUser;
/**
 * Deletes a user based on the provided username.
 * @param {Options} options - Contains the username of the user to be deleted.
 * @returns {Promise<{status: number, data: any}>}
 */
function deleteUser(options) {
    return __awaiter(this, void 0, void 0, function* () {
        let conn;
        try {
            const { username, confirm } = options;
            if (!confirm) {
                throw new error_1.PermanentError('Deletion must be confirmed.', 'CONFIRMATION_REQUIRED');
            }
            conn = yield database_1.default.getConnection();
            yield conn.beginTransaction();
            // Delete user-profile associations first
            const delProfileAssoc = yield conn.query('DELETE FROM edoc2.User_Profile WHERE user_id = (SELECT user_id FROM edoc2.User WHERE username = ?)', [username]);
            if (delProfileAssoc.affectedRows === 0) {
                return { status: 404, data: { error: 'The user does not exist.' } };
            }
            // Then delete the user
            const delUser = yield conn.query('DELETE FROM edoc2.User WHERE username = ?', [username]);
            if (delUser.affectedRows === 0) {
                return { status: 404, data: { error: 'The user does not exist.' } };
            }
            yield conn.commit();
            // Successfully deleted
            return { status: 200, data: { message: 'User successfully deleted.' } };
        }
        catch (err) {
            yield conn.rollback();
            logger_1.logger.error(`Error deleting user: ${err}`);
            throw new error_1.TransientError('Failed to delete user', 'DELETE_FAIL');
        }
        finally {
            if (conn)
                yield conn.release();
        }
    });
}
exports.deleteUser = deleteUser;
/**
 * Retrieves the profile information for a specified user.
 * @param {Options} options - Contains the username of the user.
 * @returns {Promise<{status: number, data: any}>}
 */
function getUser(options) {
    return __awaiter(this, void 0, void 0, function* () {
        let conn;
        try {
            conn = yield database_1.default.getConnection();
            const { username } = options;
            const userQuery = 'SELECT user_id, first_name, last_name, username, user_type, email, is_active FROM edoc2.User WHERE username = ?';
            const userResult = yield conn.query(userQuery, [username]);
            if (userResult.length === 0) {
                throw new error_1.PermanentError('Profile not found', 'NOT_FOUND');
            }
            const userProfileQuery = `
    SELECT up.profile_id, p.unique_profile_id
    FROM edoc2.User_Profile up
    JOIN edoc2.Profile p ON up.profile_id = p.profile_id
    WHERE up.user_id = ?
  `;
            const profileResult = yield conn.query(userProfileQuery, [
                userResult[0].user_id,
            ]);
            const eDocProfiles = profileResult.map((profile) => profile.unique_profile_id);
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
            return { status: 200, data: formattedResult };
        }
        catch (err) {
            logger_1.logger.error(`Error fetching user profile: ${err}`);
            throw new error_1.TransientError('Internal server error', 'SERVER_ERROR');
        }
        finally {
            if (conn)
                yield conn.release();
        }
    });
}
exports.getUser = getUser;
/**
 * Lists users based on provided search criteria.
 * @param {Options} options - Contains filtering criteria.
 * @returns {Promise<{status: number, data: any}>}
 */
function listUsers(options) {
    return __awaiter(this, void 0, void 0, function* () {
        let conn;
        try {
            conn = yield database_1.default.getConnection();
            const queryData = options.query;
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
            const params = [];
            const whereConditions = [];
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
            const users = yield conn.query(sqlQuery, params);
            // This transformation is needed to align the raw SQL output to the expected API output
            const formattedResults = users.map((user) => ({
                firstName: user.first_name,
                lastName: user.last_name,
                username: user.username,
                email: user.email,
                userType: user.user_type,
                isActive: !!user.is_active,
                eDocProfiles: user.eDocProfiles.split(', '),
            }));
            return { status: 200, data: formattedResults };
        }
        catch (err) {
            logger_1.logger.error(`Error listing users: ${err}`);
            throw new error_1.TransientError('Internal server error', 'DB_FAIL');
        }
        finally {
            if (conn)
                yield conn.release();
        }
    });
}
exports.listUsers = listUsers;
/**
 * Creates a new object in the database with the specified properties.
 * @param {Options} options - Contains the object data.
 * @returns {Promise<{status: number, data: any}>}
 */
function createObject(options) {
    return __awaiter(this, void 0, void 0, function* () {
        let conn;
        try {
            const { body } = options;
            const { ac_number, profile, object_type_name, label, belongs_to_aggregate, file_url, } = body;
            // Check AC number exists in Alma
            const almaConnection = (0, almaApiHelpers_1.getAlmaConnection)();
            conn = yield database_1.default.getConnection();
            const almaBib = yield (0, almaApiHelpers_1.fetchBibFromAlma)(ac_number, almaConnection);
            if (!almaBib) {
                return { status: 404, data: { error: 'AC number not found in Alma.' } };
            }
            // Retrieve profile_id based on profile identifier
            const profileResult = yield conn.query('SELECT profile_id FROM edoc2.Profile WHERE unique_profile_id = ?', [profile]);
            if (profileResult.length === 0) {
                return { status: 404, data: { error: 'Profile identifier not found.' } };
            }
            const profile_id = profileResult[0].profile_id;
            // Retrieve object type code based on type name
            const typeResult = yield conn.query('SELECT type_code FROM edoc2.Edoc_Content_Types WHERE type_name = ?', [object_type_name]);
            if (typeResult.length === 0) {
                return { status: 404, data: { error: 'Object type not found.' } };
            }
            const object_type = typeResult[0].type_code;
            // Retrieve the next sequence number
            const sequenceResult = 
            // eslint-disable-next-line max-len
            yield conn.query('SELECT MAX(sequence_number) AS max_sequence FROM edoc2.Edoc_Content WHERE ac_number = ? AND object_type = ?', [ac_number, object_type]);
            const sequence_number = sequenceResult[0].max_sequence
                ? String(Number(sequenceResult[0].max_sequence) + 1).padStart(2, '0')
                : '01';
            const query = 
            // eslint-disable-next-line max-len
            'INSERT INTO edoc2.Edoc_Content (ac_number, profile_id, sequence_number, object_type, mime_id, label, belongs_to_aggregate, size, file_path, create_date, update_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())';
            const result = yield conn.query(query, [
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
            }
            else {
                return { status: 400, data: { error: 'Failed to create object.' } };
            }
        }
        catch (err) {
            logger_1.logger.error(`Error creating object: ${err}`);
            return { status: 500, data: { error: 'Internal server error' } };
        }
        finally {
            if (conn)
                yield conn.release();
        }
    });
}
exports.createObject = createObject;
/**
 * Searches for objects in the database based on provided search criteria.
 * @param {Options} options - Contains the query parameters for searching.
 * @returns {Promise<{status: number, data: any}>}
 */
function searchObjects(options) {
    return __awaiter(this, void 0, void 0, function* () {
        let conn;
        try {
            conn = yield database_1.default.getConnection();
            // Ensure the query object exists or default to an empty object
            const query = options.query || {};
            const { acnr, isil, profile, sequence, objectType, belongsToAggregate, label, dateRange, fileName, sortBy = 'ac_number', // Default sorting field
            sortOrder = 'asc', // Default sorting order
            page = 1, limit = 10, } = query;
            // eslint-disable-next-line max-len
            let sqlQuery = `SELECT c.object_id, c.ac_number, p.unique_profile_id, c.sequence_number, ect.type_name, m.mime_type, c.belongs_to_aggregate, c.label, c.file_name,
      c.size, c.create_date, c.update_date
      FROM edoc2.Edoc_Content c
      JOIN edoc2.Edoc_Content_Types ect ON c.object_type = ect.type_code
      JOIN edoc2.Profile p ON p.profile_id = c.profile_id
      JOIN edoc2.Mime_Types m ON c.mime_id = m.mime_id`;
            const queryParams = [];
            const whereConditions = [];
            if (acnr)
                whereConditions.push('c.ac_number = ?') && queryParams.push(acnr);
            if (isil)
                whereConditions.push('p.isil = ?') && queryParams.push(isil);
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
            if (label)
                whereConditions.push('c.label = ?') && queryParams.push(label);
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
            const objects = yield conn.query(sqlQuery, queryParams);
            //transformation is needed to align the raw sql output with the expected API output
            const formattedResults = objects.map((object) => ({
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
            return { status: 200, data: formattedResults };
        }
        catch (err) {
            logger_1.logger.error(`Error searching objects: ${err}`);
            return { status: 500, data: { error: 'Internal server error' } };
        }
        finally {
            if (conn)
                yield conn.release();
        }
    });
}
exports.searchObjects = searchObjects;
/**
 * Deletes all objects associated with a given AC number from the database.
 * @param {Options} options - Contains the AC number and confirmation flag.
 * @returns {Promise<{status: number, data: any}>}
 */
function deleteObjects(options) {
    return __awaiter(this, void 0, void 0, function* () {
        let conn;
        try {
            const { acnr, confirm } = options;
            if (!acnr) {
                return { status: 400, data: { error: 'ACNR is required.' } };
            }
            if (!confirm) {
                return { status: 400, data: { error: 'Deletion must be confirmed.' } };
            }
            conn = yield database_1.default.getConnection();
            const result = yield conn.query('DELETE FROM Edoc_Content WHERE ac_number = ?', [acnr]);
            if (result.affectedRows === 0) {
                return {
                    status: 404,
                    data: { error: 'Objects not found or already deleted.' },
                };
            }
            return { status: 200, data: { message: 'Objects deleted successfully.' } };
        }
        catch (err) {
            logger_1.logger.error(`Error deleting objects: ${err}`);
            return { status: 500, data: { error: 'Internal server error' } };
        }
        finally {
            if (conn)
                yield conn.release();
        }
    });
}
exports.deleteObjects = deleteObjects;
/**
 * Retrieves a specific object from the database based on the given criteria.
 * @param {Options} options - Contains criteria for object retrieval.
 * @returns {Promise<{status: number, data: any}>}
 *
 */
function getObjectMetadata(options) {
    return __awaiter(this, void 0, void 0, function* () {
        let conn;
        try {
            conn = yield database_1.default.getConnection();
            const { acnr, acRecordObjectId } = options;
            if (!acnr || !acRecordObjectId) {
                return { status: 400, data: { error: 'Missing required parameters' } };
            }
            const { type, sequence, isNumericType } = (0, idUtils_1.decomposeObjectID)(acRecordObjectId);
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
            const queryResult = yield conn.query(query, params);
            if (queryResult.length === 0) {
                return { status: 404, data: { error: 'Object not found.' } };
            }
            const formattedResult = queryResult.map((object) => ({
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
            return { status: 200, data: formattedResult[0] }; // Return the first object found
        }
        catch (err) {
            logger_1.logger.error(`Error retrieving object: ${err}`);
            return { status: 500, data: { error: 'Internal server error' } };
        }
        finally {
            if (conn)
                yield conn.release();
        }
    });
}
exports.getObjectMetadata = getObjectMetadata;
/**
 * @param {Object} options
 * @param {String} options.acnr the acnr of the object
 * @param {String} options.acRecordObjectId the acRecordObjectId of the object
 * @param {Object} options.updateFields the fields to update
 * @throws {Error}
 * @return {Promise}
 */
function updateObjectmetadata(options) {
    return __awaiter(this, void 0, void 0, function* () {
        let conn;
        try {
            conn = yield database_1.default.getConnection();
            yield conn.beginTransaction();
            const { acnr, acRecordObjectId, body } = options;
            const { type, sequence, isNumericType } = (0, idUtils_1.decomposeObjectID)(acRecordObjectId);
            // Initialize typeCode with type if it's numeric, otherwise fetch the code from the database
            let typeCode = type;
            if (!isNumericType) {
                const typeCodeResult = yield conn.query('SELECT type_code FROM edoc2.Edoc_Content_Types WHERE mnemonic = ?', [type]);
                if (typeCodeResult.length === 0) {
                    throw new error_1.PermanentError('Object type not found', 'TYPE_NOT_FOUND');
                }
                typeCode = typeCodeResult[0].type_code;
            }
            // Check for sequence conflicts if sequence is updated
            if (body.sequence && body.sequence !== sequence) {
                const existingSequence = yield conn.query('SELECT 1 FROM edoc2.Edoc_Content WHERE ac_number = ? AND object_type = ? AND sequence_number = ?', [acnr, type, body.sequence]);
                if (existingSequence.length > 0) {
                    throw new error_1.PermanentError('Sequence number already exists for this AC number and type', 'SEQUENCE_EXISTS');
                }
            }
            // Prepare fields for update
            const fieldsToUpdate = [];
            const valuesToUpdate = [];
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
            const result = yield conn.query(updateQuery, [
                ...valuesToUpdate,
                acnr,
                typeCode,
                sequence,
            ]);
            if (result.affectedRows === 0) {
                throw new error_1.PermanentError('Object not found or no changes applied', 'OBJECT_NOT_FOUND');
            }
            yield conn.commit();
            return { status: 204, data: { message: 'Object updated successfully.' } };
        }
        catch (err) {
            yield conn.rollback();
            logger_1.logger.error(`Error updating object: ${err}`);
            if (err instanceof error_1.ServerError) {
                throw err;
            }
            else {
                throw new error_1.TransientError('Internal server error during update', 'UPDATE_FAIL');
            }
        }
        finally {
            if (conn)
                conn.release();
        }
    });
}
exports.updateObjectmetadata = updateObjectmetadata;
/**
 * Deletes a specific object from the database based on given criteria.
 * @param {Options} options - Contains criteria for object deletion and a confirmation flag.
 * @returns {Promise<{status: number, data: any}>}
 */
function deleteObjectMetadata(options) {
    return __awaiter(this, void 0, void 0, function* () {
        let conn;
        try {
            conn = yield database_1.default.getConnection();
            const { acnr, acRecordObjectId, confirm } = options;
            if (!confirm) {
                return { status: 400, data: { error: 'Deletion must be confirmed.' } };
            }
            // Ensure acRecordObjectId is a string
            const acRecordObjectIdString = acRecordObjectId || '';
            // Decompose acRecordObjectId to determine if it's a mnemonic or type code
            const { type, sequence, isNumericType } = (0, idUtils_1.decomposeObjectID)(acRecordObjectIdString);
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
            const queryResult = yield conn.query(query, [acnr, type, sequence]);
            if (queryResult.affectedRows === 0) {
                throw new error_1.PermanentError('Object not found.', 'OBJECT_NOT_FOUND');
            }
            return { status: 200, data: { message: 'Object deleted successfully.' } };
        }
        catch (err) {
            if (conn) {
                yield conn.rollback();
            }
            if (err instanceof error_1.ServerError) {
                throw err;
            }
            throw new error_1.TransientError('Internal server error during deletion.', 'DELETE_FAIL');
        }
        finally {
            if (conn) {
                yield conn.release();
            }
        }
    });
}
exports.deleteObjectMetadata = deleteObjectMetadata;
/**
 * @param {Object} options
 * @param {String} options.acnr the acnr of the object
 * @param {String} options.acRecordObjectId the acRecordObjectId of the object
 * @throws {Error}
 * @return {Promise}
 */
function fetchObjectData(options) {
    return __awaiter(this, void 0, void 0, function* () {
        let conn;
        try {
            conn = yield database_1.default.getConnection();
            const { acnr, acRecordObjectId } = options;
            // Ensure acRecordObjectId is a string
            const acRecordObjectIdString = acRecordObjectId || '';
            const { type, sequence, isNumericType } = (0, idUtils_1.decomposeObjectID)(acRecordObjectIdString);
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
            const result = yield conn.query(query, params);
            console.log(result);
            if (result.length === 0) {
                return { status: 404, data: 'File not found' };
            }
            const filePath = result[0].file_name;
            console.log(filePath);
            if (!filePath) {
                return { status: 404, data: 'File path is empty' };
            }
            return { status: 200, data: filePath };
        }
        catch (err) {
            logger_1.logger.error(`Error fetching object data: ${err}`);
            return { status: 500, data: 'Internal server error' };
        }
        finally {
            if (conn)
                conn.release();
        }
    });
}
exports.fetchObjectData = fetchObjectData;
/**
 * @param {Object} options
 * @param {String} options.acnr the acnr of the object
 * @param {String} options.acRecordObjectId the acRecordObjectId of the object
 * @throws {Error}
 * @return {Promise}
 */
function uploadObjectData(options) {
    return __awaiter(this, void 0, void 0, function* () {
        let conn;
        try {
            conn = yield database_1.default.getConnection();
            const { acnr, acRecordObjectId, file } = options;
            if (!file) {
                return { status: 400, data: 'No file provided' };
            }
            if (!file.path || !file.filename) {
                return { status: 400, data: 'Incomplete file data' };
            }
            const { type, sequence, isNumericType } = (0, idUtils_1.decomposeObjectID)(acRecordObjectId || '');
            let checkQuery = 'SELECT * FROM Edoc_Content WHERE ac_number = ? AND sequence_number = ?';
            const queryParams = [acnr, sequence];
            if (isNumericType) {
                checkQuery += ' AND object_type = ?';
                queryParams.push(type);
            }
            else {
                checkQuery +=
                    ' AND object_type = (SELECT type_code FROM Edoc_Content_Types WHERE mnemonic = ?)';
                queryParams.push(type);
            }
            const checkResult = yield conn.query(checkQuery, queryParams);
            if (checkResult.length === 0) {
                return { status: 404, data: 'Object not found' };
            }
            //modification to extract only the part of file path
            const relativeFilePath = `/${path_1.default.basename(file.path)}`;
            const updateQuery = `
    UPDATE Edoc_Content SET
      file_path = ?,
      size = ?,
      update_date = NOW(),
      file_name = ?
    WHERE ac_number = ? AND sequence_number = ? AND object_type = ?;
  `;
            yield conn.query(updateQuery, [
                relativeFilePath,
                file.size,
                file.filename,
                acnr,
                sequence,
                type,
            ]);
            return { status: 200, data: 'File updated successfully' };
        }
        catch (err) {
            logger_1.logger.error(`Error uploading object data: ${err}`);
            return { status: 500, data: 'Internal server error' };
        }
        finally {
            if (conn)
                conn.release();
        }
    });
}
exports.uploadObjectData = uploadObjectData;
/**
 * @param {Object} options
 * @param {String} options.acnr the acnr of the object
 * @param {String} options.acRecordObjectId the acRecordObjectId of the object
 * @param {Boolean} options.confirm confirm the deletion
 * @throws {Error}
 * @return {Promise}
 */
function deleteObjectData(options) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!options.confirm) {
            return { status: 400, data: 'Deletion must be confirmed' };
        }
        let conn;
        try {
            conn = yield database_1.default.getConnection();
            const { acnr, acRecordObjectId } = options;
            //Decompose acRecordObjectId to determine type and sequence
            const { type, sequence, isNumericType } = (0, idUtils_1.decomposeObjectID)(acRecordObjectId || '');
            // eslint-disable-next-line max-len
            const typeCondition = isNumericType
                ? 'object_type = ?'
                : 'object_type = (SELECT type_code FROM edoc2.Edoc_Content_Types WHERE mnemonic = ?)';
            //Retrieve file_name from Edoc_Content and delete the file
            const query = `
      SELECT file_name FROM edoc2.Edoc_Content
      WHERE ac_number = ? AND sequence_number = ? AND ${typeCondition};
    `;
            const fileResult = yield conn.query(query, [acnr, sequence, type]);
            if (fileResult.length === 0) {
                return { status: 404, data: 'Object not found' };
            }
            const filePath = fileResult[0].file_name;
            if (filePath) {
                //check if file exists before deleting
                const fullPath = path_1.default.join(__dirname, '../../public/data', filePath);
                logger_1.logger.debug(`Deleting file at: ${fullPath}`);
                if (fs_1.default.existsSync(fullPath)) {
                    fs_1.default.unlinkSync(fullPath); //delete file
                    logger_1.logger.info(`Deleted file: ${fullPath}`);
                }
                else {
                    logger_1.logger.warn(`File not found: ${fullPath}`);
                }
            }
            //Delete object from Edoc_Content
            const deleteQuery = `
      DELETE FROM edoc2.Edoc_Content
      WHERE ac_number = ? AND sequence_number = ? AND ${typeCondition};
    `;
            const deleteResult = yield conn.query(deleteQuery, [acnr, sequence, type]);
            if (deleteResult.affectedRows === 0) {
                return { status: 404, data: 'Failed to delete  database record' };
            }
            return { status: 200, data: 'Object data deleted successfully' };
        }
        catch (err) {
            logger_1.logger.error(`Error deleting object data: ${err}`);
            return { status: 500, data: 'Internal server error' };
        }
        finally {
            if (conn)
                conn.release();
        }
    });
}
exports.deleteObjectData = deleteObjectData;
/**
 * @param {Object} options
 * @param {String} options.acnr AC Number identifying the object.
 * @param {String} options.object_type Type of the object to be delivered.
 * @param {String} options.sequence Sequence number of the object,
 *  determining its order among multiple objects associated with the same AC number.
 * @throws {Error}
 * @return {Promise}
 */
function directDelivery(options) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { acnr, object_type, sequence } = options; //objectType is just added for type checking
            const conn = yield database_1.default.getConnection();
            const query = `
      SELECT file_path FROM edoc.Edoc_Content
      WHERE ac_number = ? AND object_type = ? AND sequence_number = ?
      LIMIT 1
    `;
            const rows = yield conn.query(query, [acnr, object_type, sequence]);
            conn.release();
            if (rows.length === 0) {
                return { status: 404, data: { error: 'Object not found.' } };
            }
            const filePath = rows[0].file_path;
            //  `filePath` is a path relative to a public or accessible directory
            return { status: 200, data: { filePath } };
        }
        catch (err) {
            console.error(`Error during direct delivery: ${err}`);
            return { status: 500, data: { error: 'Internal server error' } };
        }
    });
}
exports.directDelivery = directDelivery;
/**
 * @param {Object} options
 * @param {String} options.acnr the acnr of the object
 * @param {String} options.profile creator of the object
 * @param {String} options.sequence the sequence of the object
 * @param {String} options.modifier the modifier of the object
 * @throws {Error}
 * @return {Promise}
 */
function createFullTextCache(options) {
    return __awaiter(this, void 0, void 0, function* () {
        let result;
        try {
            result = { status: 400, data: 'TODO: implement' }; //await processRequestv1(options);
        }
        catch (err) {
            logger_1.logger.error(err);
            return {
                status: err.status || 500,
                data: err.message || 'Default Error',
            };
        }
        return {
            status: result.status || 200,
            data: result.data || '',
        };
    });
}
exports.createFullTextCache = createFullTextCache;
/**
 * @param {Object} options
 * @param {String} options.acnr the acnr of the object
 * @param {String} options.profile creator of the object
 * @param {String} options.modifier the modifier of the object
 * @param {String} options.sequence the sequence of the object
 * @throws {Error}
 * @return {Promise}
 */
function getFullTextCache(options) {
    return __awaiter(this, void 0, void 0, function* () {
        let result;
        try {
            result = { status: 400, data: 'TODO: implement' }; //await processRequestv1(options);
        }
        catch (err) {
            logger_1.logger.error(err);
            return {
                status: err.status || 500,
                data: err.message || 'Default Error',
            };
        }
        return {
            status: result.status || 200,
            data: result.data || '',
        };
    });
}
exports.getFullTextCache = getFullTextCache;
/**
 * @param {Object} options
 * @param {String} options.acnr the acnr of the object
 * @param {String} options.profile creator of the object
 * @param {String} options.modifier the modifier of the object
 * @param {String} options.sequence the sequence of the object
 * @throws {Error}
 * @return {Promise}
 */
function rebuildFullTextCache(options) {
    return __awaiter(this, void 0, void 0, function* () {
        let result;
        try {
            result = { status: 400, data: 'TODO: implement' }; //await processRequestv1(options);
        }
        catch (err) {
            logger_1.logger.error(err);
            return {
                status: err.status || 500,
                data: err.message || 'Default Error',
            };
        }
        return {
            status: result.status || 200,
            data: result.data || '',
        };
    });
}
exports.rebuildFullTextCache = rebuildFullTextCache;
/**
 * @param {Object} options
 * @throws {Error}
 * @return {Promise}
 */
function extendPnxWithFullText(options) {
    return __awaiter(this, void 0, void 0, function* () {
        let result;
        try {
            result = { status: 400, data: 'TODO: implement' }; //await processRequestv1(options);
        }
        catch (err) {
            logger_1.logger.error(err);
            return {
                status: err.status || 500,
                data: err.message || 'Default Error',
            };
        }
        return {
            status: result.status || 200,
            data: result.data || '',
        };
    });
}
exports.extendPnxWithFullText = extendPnxWithFullText;
/**
 * @param {Object} options
 * @param {Integer} options.userIdQuery the userId of the user
 * @param {String} options.timeRange the time range of the report
 * @param {String} options.activityType the activity type of the report
 * @throws {Error}
 * @return {Promise}
 */
function generateUserReport(options) {
    return __awaiter(this, void 0, void 0, function* () {
        let result;
        try {
            result = { status: 400, data: 'TODO: implement' }; //await processRequestv1(options);
        }
        catch (err) {
            logger_1.logger.error(err);
            return {
                status: err.status || 500,
                data: err.message || 'Default Error',
            };
        }
        return {
            status: result.status || 200,
            data: result.data || '',
        };
    });
}
exports.generateUserReport = generateUserReport;
/**
 * @param {Object} options
 * @param {String} options.profileId ID of the profile
 * @param {String} options.timeRange Time range for the statistics (e.g., &#x27;total&#x27; or &#x27;lastMonth&#x27;)
 * @param {String} options.objectType Specific object type to filter the statistics
 * @throws {Error}
 * @return {Promise}
 */
function getContributionsStats(options) {
    return __awaiter(this, void 0, void 0, function* () {
        let result;
        try {
            result = { status: 400, data: 'TODO: implement' }; //await processRequestv1(options);
        }
        catch (err) {
            logger_1.logger.error(err);
            return {
                status: err.status || 500,
                data: err.message || 'Default Error',
            };
        }
        return {
            status: result.status || 200,
            data: result.data || '',
        };
    });
}
exports.getContributionsStats = getContributionsStats;
/**
 * @param {Object} options
 * @param {String} options.profileId The profile to filter the statistics by.
 * @throws {Error}
 * @return {Promise}
 */
function getWebAccessesStats(options) {
    return __awaiter(this, void 0, void 0, function* () {
        let result;
        try {
            result = { status: 400, data: 'TODO: implement' }; //await processRequestv1(options);
        }
        catch (err) {
            logger_1.logger.error(err);
            return {
                status: err.status || 500,
                data: err.message || 'Default Error',
            };
        }
        return {
            status: result.status || 200,
            data: result.data || '',
        };
    });
}
exports.getWebAccessesStats = getWebAccessesStats;
//# sourceMappingURL=v1.js.map