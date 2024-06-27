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
exports.validateDeleteObject = exports.validateTransformPatchObjectMatadata = exports.validateRetrieveMetaData = exports.validateDeleteObjects = exports.validateAndTransformObjectSearch = exports.validateAndTransformObjectCreation = exports.validateAndTransformedUserListQuery = exports.validateUserDeleting = exports.validateUser = exports.validateAndTransformPatchUser = exports.validateAndTransformedUserRegistration = exports.validateAndTransformEDocProfileListQuery = exports.validateDeleteProfile = exports.validateAndTransformPatchProfile = exports.validateGetProfile = exports.validateAndTransformEDocProfile = void 0;
const fieldMappings_1 = require("./fieldMappings");
const validation_1 = require("./validation");
const error_1 = require("./error");
/**
 * Middleware to validate and transform eDoc profile request data.
 */
function validateAndTransformEDocProfile(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const validation = (0, validation_1.validateEDocProfile)(req.body);
        if (validation.error) {
            const error = new error_1.RequestError(validation.error.details[0].message);
            return res.status(error.status).json(error.getErrorBodyJson());
        }
        // Transform the request data from camelCase/API format to snake_case/DB format
        req.body = (0, fieldMappings_1.mapRequestDataToDbFields)(req.body);
        next();
    });
}
exports.validateAndTransformEDocProfile = validateAndTransformEDocProfile;
/**
 * Middleware to validate eDoc profile request data.
 */
function validateGetProfile(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const validation = (0, validation_1.validateEDocProfileId)(req.params.profileId);
        if (validation.error) {
            const error = new error_1.RequestError(validation.error.details[0].message);
            return res.status(error.status).json(error.getErrorBodyJson());
        }
        next();
    });
}
exports.validateGetProfile = validateGetProfile;
/**
 * Middleware to validate and process patch requests for eDoc profiles.
 *
 * @param {Request} req - The request object
 * @param {Response} res - The response object
 * @param {NextFunction} next - The next middleware function
 */
function validateAndTransformPatchProfile(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const validation = (0, validation_1.validateEDocProfilePatch)(req.body);
        if (validation.error) {
            const error = new error_1.RequestError(validation.error.details[0].message);
            return res.status(error.status).json(error.getErrorBodyJson());
        }
        // Transform the request data from camelCase/API format to snake_case/DB format
        req.body = (0, fieldMappings_1.mapRequestDataToDbFields)(req.body);
        next();
    });
}
exports.validateAndTransformPatchProfile = validateAndTransformPatchProfile;
/**
 * Validates the deletion of an eDoc profile based on the request parameters and query string.
 */
function validateDeleteProfile(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const validation = (0, validation_1.validateEDocProfileDelete)({
            profileId: req.params.profileId,
            confirm: req.query.confirm === 'true',
        });
        if (validation.error) {
            const error = new error_1.RequestError(validation.error.details[0].message);
            return res.status(error.status).json(error.getErrorBodyJson());
        }
        next();
    });
}
exports.validateDeleteProfile = validateDeleteProfile;
/**
 *
 */
function validateAndTransformEDocProfileListQuery(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const validation = (0, validation_1.validateEDocProfileListQuery)(req.query);
        if (validation.error) {
            const error = new error_1.RequestError(validation.error.details[0].message);
            return res.status(error.status).json(error.getErrorBodyJson());
        }
        // Apply field mappings and type conversions
        const mappedQuery = (0, fieldMappings_1.mapRequestDataToDbFields)(req.query);
        const transformedQuery = {};
        Object.entries(mappedQuery).forEach(([key, value]) => {
            // Handle boolean conversions
            if (key === 'is_active' || key === 'full_text_deposit') {
                transformedQuery[key] =
                    value === 'true' ? true : value === 'false' ? false : value;
            }
            else if (key === 'profile_allowed_types' && typeof value === 'string') {
                // Split and trim the allowed types if they're in string form
                transformedQuery[key] = value
                    .split(',')
                    .map((type) => type.trim());
            }
            else {
                transformedQuery[key] = value;
            }
        });
        req.query = transformedQuery;
        next();
    });
}
exports.validateAndTransformEDocProfileListQuery = validateAndTransformEDocProfileListQuery;
/**
 *
 */
function validateAndTransformedUserRegistration(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const validation = (0, validation_1.validateUserRegistration)(req.body);
        if (validation.error) {
            const error = new error_1.RequestError(validation.error.details[0].message);
            return res.status(error.status).json(error.getErrorBodyJson());
        }
        // Transform the request data from camelCase/API format to snake_case/DB format
        req.body = (0, fieldMappings_1.mapRequestDataToDbFields)(req.body);
        next();
    });
}
exports.validateAndTransformedUserRegistration = validateAndTransformedUserRegistration;
/**
 *
 */
function validateAndTransformPatchUser(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const validation = (0, validation_1.validateUserPatch)(req.body);
        if (validation.error) {
            const error = new error_1.RequestError(validation.error.details[0].message);
            return res.status(error.status).json(error.getErrorBodyJson());
        }
        // Transform the request data from camelCase/API format to snake_case/DB format
        req.body = (0, fieldMappings_1.mapRequestDataToDbFields)(req.body);
        next();
    });
}
exports.validateAndTransformPatchUser = validateAndTransformPatchUser;
/**
 *
 */
function validateUser(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const usernameValidation = (0, validation_1.validateUsername)(req.params);
        if (usernameValidation.error) {
            const error = new error_1.RequestError(usernameValidation.error.details[0].message);
            return res.status(error.status).json(error.getErrorBodyJson());
        }
        next();
    });
}
exports.validateUser = validateUser;
/**
 *
 */
function validateUserDeleting(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const validate = validation_1.validateUserDelete.validate({
            username: req.params.username,
            confirm: req.query.confirm === 'true',
        });
        if (validate.error) {
            const error = new error_1.RequestError(validate.error.details[0].message);
            return res.status(error.status).json(error.getErrorBodyJson());
        }
        next();
    });
}
exports.validateUserDeleting = validateUserDeleting;
/**
 *
 */
function validateAndTransformedUserListQuery(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const validation = (0, validation_1.validateUserListQuery)(req.query);
        if (validation.error) {
            const error = new error_1.RequestError(validation.error.details[0].message);
            return res.status(error.status).json(error.getErrorBodyJson());
        }
        // Apply field mappings and type conversions
        const mappedQuery = (0, fieldMappings_1.mapRequestDataToDbFields)(req.query);
        const transformedQuery = {};
        Object.entries(mappedQuery).forEach(([key, value]) => {
            // Specific handling for eDocProfiles field in the query
            // here we map it to p.unique_profile_id
            if (key === 'eDocProfiles') {
                transformedQuery['p.unique_profile_id'] = value;
            }
            else if (key === 'is_active') {
                // convert boolean values for is_active
                transformedQuery[key] = value === 'true' ? true : false;
            }
            else {
                // apply all other mappings as usual
                transformedQuery[key] = value;
            }
        });
        req.query = transformedQuery;
        next();
    });
}
exports.validateAndTransformedUserListQuery = validateAndTransformedUserListQuery;
/**
 *
 */
function validateAndTransformObjectCreation(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const validation = (0, validation_1.validateObjectCreation)(req.body);
        if (validation.error) {
            const error = new error_1.RequestError(validation.error.details[0].message);
            return res.status(error.status).json(error.getErrorBodyJson());
        }
        // Transform the request data from camelCase/API format to snake_case/DB format
        req.body = (0, fieldMappings_1.mapRequestDataToDbFields)(req.body);
        next();
    });
}
exports.validateAndTransformObjectCreation = validateAndTransformObjectCreation;
/**
 *
 */
function validateAndTransformObjectSearch(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const validation = (0, validation_1.validateSearchObjects)(req.query);
        if (validation.error) {
            const error = new error_1.RequestError(validation.error.details[0].message);
            return res.status(error.status).json(error.getErrorBodyJson());
        }
        const mappedQuery = (0, fieldMappings_1.mapRequestDataToDbFields)(req.query);
        const transformedQuery = {};
        Object.entries(mappedQuery).forEach(([key, value]) => {
            transformedQuery[key] = value;
        });
        req.query = transformedQuery;
        next();
    });
}
exports.validateAndTransformObjectSearch = validateAndTransformObjectSearch;
/**
 *
 */
function validateDeleteObjects(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const validation = (0, validation_1.validateObjectsDelete)({
            acnr: req.query.acnr,
            confirm: req.query.confirm === 'true',
        });
        if (validation.error) {
            const error = new error_1.RequestError(validation.error.details[0].message);
            return res.status(error.status).json(error.getErrorBodyJson());
        }
        next();
    });
}
exports.validateDeleteObjects = validateDeleteObjects;
/**
 *
 */
function validateRetrieveMetaData(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const validation = (0, validation_1.validateMetaDataRetrieve)(req.params);
        if (validation.error) {
            const error = new error_1.RequestError(validation.error.details[0].message);
            return res.status(error.status).json(error.getErrorBodyJson());
        }
        next();
    });
}
exports.validateRetrieveMetaData = validateRetrieveMetaData;
/**
 *
 */
function validateTransformPatchObjectMatadata(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const validation = (0, validation_1.validateAndTransformMetaDataPatch)(req.body);
        if (validation.error) {
            const error = new error_1.RequestError(validation.error.details[0].message);
            return res.status(error.status).json(error.getErrorBodyJson());
        }
        // Transform the request data from camelCase/API format to snake_case/DB format
        req.body = (0, fieldMappings_1.mapRequestDataToDbFields)(req.body);
        next();
    });
}
exports.validateTransformPatchObjectMatadata = validateTransformPatchObjectMatadata;
/**
 *
 */
function validateDeleteObject(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const validation = (0, validation_1.validateObjectDelete)({
            acnr: req.params.acnr,
            acRecordObjectId: req.params.acRecordObjectId,
            confirm: req.query.confirm, // Use req.query here
        });
        if (validation.error) {
            const error = new error_1.RequestError(validation.error.details[0].message);
            return res.status(error.status).json(error.getErrorBodyJson());
        }
        next();
    });
}
exports.validateDeleteObject = validateDeleteObject;
//# sourceMappingURL=middleware.js.map