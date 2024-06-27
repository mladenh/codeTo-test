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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProfileId = void 0;
const logger_1 = require("../lib/logger");
const error_1 = require("./error");
/**
 * Retrieves the profile_id for a given unique_profile_id from the database.
 * @param {string} uniqueProfileId - The unique identifier of the profile to fetch.
 * @param {any} conn - Database connection to use for the query.
 * @returns {Promise<number | null>} - The profile_id if found, or null if not found.
 */
function getProfileId(uniqueProfileId, conn) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const [rows] = yield conn.query('SELECT profile_id FROM edoc2.Profile WHERE unique_profile_id = ?', [uniqueProfileId]);
            if (rows.length === 0) {
                throw new error_1.ProfileNotFoundError(`Profile not found for ID: ${uniqueProfileId}`);
            }
            return rows[0].profile_id; // Return the first (and should be only) profile_id found
        }
        catch (err) {
            logger_1.logger.error(`Error fetching profile ID: ${err.message}`);
            throw err; // Re-throw the error to be handled by the caller
        }
    });
}
exports.getProfileId = getProfileId;
//# sourceMappingURL=getProfileId.js.map