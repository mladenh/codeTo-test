"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.v1Router = void 0;
const express_1 = require("express");
const v1 = __importStar(require("../services/v1"));
const logger_1 = require("../../lib/logger");
const path_1 = __importDefault(require("path"));
const middleware_1 = require("../../lib/middleware");
const FileUpload_1 = require("../../lib/FileUpload");
const fs_1 = __importDefault(require("fs"));
const error_1 = require("../../lib/error");
exports.v1Router = (0, express_1.Router)();
/**
 * Creates a new eDoc profile and requires providing a complete
 * profile definition. The profile includes profileId,  Isil
 * code, project code and other relevant information.
 *curl -X POST http://localhost:3010/v1/api/users/eDocProfile -H "Content-Type: application/json" -d '{"profileId":"TEST2", "isil":"AT-TEST", "projectCode":"OBV-EDOC", "fullTextDeposit":true, "865mCode":"AT-OBV", "contactEmails":["test4@mail.at"],"profileAllowedTypes":["Inhaltsverzeichnis", "Volltext"], "isActive":true}'
 */
exports.v1Router.post('/api/users/edocprofile', middleware_1.validateAndTransformEDocProfile, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield v1.createEDocProfile({
            body: req.body,
        });
        /*       logAuditTrail({
          profile_id: 1,
          user_id: 1,
          action: req.method + ' ' + req.originalUrl + ' ' + result.status,
          object_id: 111,
        }); */
        res.status(result.status || 200).send(result.data);
    }
    catch (err) {
        next(err);
    }
}));
/**
 * Retrieves the eDoc profile associated with the authenticated
 * user. Users can only access their own profiles unless
 * they have administrative privileges to view others.
 * curl -X GET "http://localhost:3010/v1/api/users/edocprofile/wuw"
 */
exports.v1Router.get('/api/users/edocprofile/:profileId', middleware_1.validateGetProfile, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const options = { profileId: req.params.profileId };
    try {
        const result = yield v1.getEDocProfile(options);
        res.status(result.status || 200).send(result.data);
    }
    catch (err) {
        next(err);
    }
}));
/**
 * Updates an existing eDoc profile for the authenticated user,
 * including changing the activation status. This operation
 * allows administrators to modify profile details and activate
 * or deactivate their profile.
 * curl -X PATCH http://localhost:3010/v1/api/users/edocprofile/TEST23 -H "Content-Type: application/json" -d '{"fullTextDeposit":true, "profileAllowedTypes":["Inhaltsverzeichnis", "Volltext"]}'
 */
exports.v1Router.patch('/api/users/edocprofile/:profileId', middleware_1.validateGetProfile, middleware_1.validateAndTransformPatchProfile, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const options = {
        body: req.body,
        profileId: req.params.profileId,
    };
    try {
        const result = yield v1.updateEDocProfile(options);
        res.status(result.status || 204).send(result.data);
    }
    catch (err) {
        next(err);
    }
}));
/**
 * Deletes an existing eDoc profile identified by the profileId parameter. This
 * operation should be restricted to administrators. It
 * permanently removes the profile and its associated data from
 * the system.
 *curl -X DELETE http://localhost:3010/v1/api/users/edocprofile/TEST2?confirm=true
 */
exports.v1Router.delete('/api/users/edocprofile/:profileId', middleware_1.validateDeleteProfile, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const options = {
        profileId: req.params.profileId,
        confirm: req.query.confirm === 'true',
    };
    try {
        const result = yield v1.deleteEDocProfile(options);
        res.status(result.status).send(result.data); //TODO: status doesn't work as expected
    }
    catch (err) {
        next(err);
    }
}));
/**
 * Retrieves a list of eDoc profiles based on provided search
 * criteria. This operation can be utilized by administrators.
 * Supports filtering based on profile attributes like
 * profileId, isil code, project code, full text deposit, 865m
 * code, emails, allowed object types,  active status and wild
 * cards.
 * curl "http://localhost:3010/v1/api/users/edocprofiles?isActive=true"
 * curl "http://localhost:3010/v1/api/users/edocprofiles?projectCode=OBV-EDOC&isil=AT-DLI"
 * curl "http://localhost:3010/v1/api/users/edocprofiles?projectCode=OBV-EDOC&isil=AT-OOeLB&profileAllowedTypes=Volltext"
 * curl "http://localhost:3010/v1/api/users/edocprofiles?profileAllowedTypes=Volltext"
 */
exports.v1Router.get('/api/users/edocprofiles', middleware_1.validateAndTransformEDocProfileListQuery, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield v1.listEDocProfiles({ query: req.query });
        if (result.data) {
            res.status(result.status || 200).send(result.data);
        }
        else {
            throw new error_1.TransientError('No data found', 'NO_DATA');
        }
    }
    catch (err) {
        logger_1.logger.error(err);
        if (err instanceof error_1.ServerError) {
            res.status(err.status || 500).json(err.getErrorBodyJson());
        }
        else {
            const err = new error_1.ServerError('Internal Server Error', 'UNEXPECTED_ERROR');
            res.status(err.status || 500).json(err.getErrorBodyJson());
            next(err);
        }
    }
}));
/**
 * Registers a new user with the required properties. This
 * endpoint is restricted to administrators to ensure
 * controlled access to the eDoc. All fields in the User schema
 * are required to create a user account, including a valid
 * email address and a strong password.
 * curl -X POST http://localhost:3010/v1/api/users/register -H "Content-Type: application/json" -d '{
  "firstName": "TestFirstName",
  "lastName": "TestLastName",
  "username": "TestUserName42",
  "email": "test42@mail.at",
  "password": "qqq666",
  "userType": "admin",
  "eDocProfiles": ["TEST2", "T1"],
  "isActive": true
}'
 */
exports.v1Router.post('/api/users/register', middleware_1.validateAndTransformedUserRegistration, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield v1.registerUser({
            body: req.body,
        });
        res.status(result.status || 200).send(result.data);
    }
    catch (error) {
        const serverError = new error_1.ServerError('Internal Server Error', 'UNEXPECTED_ERROR', 500);
        next(serverError);
    }
}));
/**
 * Authenticates a user and returns a session token. The login
 * requires a valid username.
 * curl -X POST http://localhost:3010/v1/api/users/login -H "Content-Type: application/json" -d '{"username":"TestUserName2"}'
 */
//TODO: use authentication
exports.v1Router.post('/api/users/login', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const options = {
        body: req.body,
    };
    try {
        const result = yield v1.loginUser(options);
        res.status(result.status || 200).send(result.data);
    }
    catch (err) {
        next(err);
    }
}));
/**
 * Updates the information of an existing user. This endpoint
 * allows users to update their own profile information.
 * curl -X PATCH http://localhost:3010/v1/api/users/TestFirstName -H "Content-Type: application/json" -d '{"firstName":"FirstName", "userType":"admin"}'
 */
exports.v1Router.patch('/api/users/:username', middleware_1.validateUser, middleware_1.validateAndTransformPatchUser, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield v1.updateUser({
            body: req.body,
            username: req.params.username,
        });
        res.status(result.status || 204).send(result.data);
    }
    catch (err) {
        next(err);
    }
}));
/**
 * Deletes an existing user.
 * curl -X DELETE http://localhost:3010/v1/api/users/TestUserName2?confirm=true
 */
exports.v1Router.delete('/api/users/:username', middleware_1.validateUserDeleting, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const options = {
        username: (_a = req.params['username']) === null || _a === void 0 ? void 0 : _a.toString(),
        confirm: req.query.confirm === 'true',
    };
    try {
        const result = yield v1.deleteUser(options);
        res.status(result.status).send(result.data);
    }
    catch (err) {
        next(err);
    }
}));
/**
 * Retrieves the profile information for a specified user. This
 * endpoint is accessible to the user themselves or an
 * administrator.
 * curl -X GET "http://localhost:3010/v1/api/users/mcuelo/profile"
 */
exports.v1Router.get('/api/users/:username/profile', middleware_1.validateUser, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const options = {
        username: req.params.username,
    };
    try {
        const result = yield v1.getUser(options);
        if (result.data) {
            res.status(200).json(result.data);
        }
        else {
            res.status(404).json({ error: 'User not found' });
        }
    }
    catch (err) {
        next(err);
    }
}));
/**
 * Retrieves a list of users based on provided search criteria.
 * This operation is intended for administrators. Supports
 * filtering based on user attributes like username, user type,
 * and email.
 * curl "http://localhost:3010/v1/api/users?isActive=false"
 */
exports.v1Router.get('/api/users', middleware_1.validateAndTransformedUserListQuery, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield v1.listUsers({ query: req.query });
        if (result.data) {
            res.status(result.status || 200).send(result.data);
        }
        else {
            throw new error_1.TransientError('No data found', 'NO_DATA');
        }
    }
    catch (err) {
        logger_1.logger.error(err);
        if (err instanceof error_1.ServerError) {
            res.status(err.status || 500).json(err.getErrorBodyJson());
        }
        else {
            const err = new error_1.ServerError('Internal Server Error', 'UNEXPECTED_ERROR');
            res.status(err.status || 500).json(err.getErrorBodyJson());
        }
    }
}));
/**
 * Creates a new object metadata in the database with the
 * specified properties. This operation requires all necessary
 * object data, including ACNR, profile, sequence, object type,
 * and file information.
 * export API_KEY=l8xx4b5d73f604b243a3b963377c089225f3
 *  curl -X POST http://localhost:3010/v1/api/catalog/objects \
  -H "Content-Type: application/json" \
  -d '{"acnr":"AC00002177", "profile":"wuw", "objectType":"Inhaltsverzeichnis", "label":"Bd. 127.2007", "belongsToAggregate": false}'
  curl -X POST http://localhost:3010/v1/api/catalog/objects   -H "Content-Type: application/json"   -d '{"acnr":"AC00002177", "profile":"wuw", "objectType":"Volltext", "label":"Bd. 128.2007", "belongsToAggregate": false}'
 */
exports.v1Router.post('/api/catalog/objects', middleware_1.validateAndTransformObjectCreation, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield v1.createObject({
            body: req.body,
        });
        res.status(result.status).send(result.data);
    }
    catch (err) {
        next(err);
    }
}));
/**
 * Searches for objects in the database using various criteria
 * such as ACNR, profile, modifier, sequence, object type, and
 * file extension. Supports sorting, pagination, and filtering.
 * curl "http://localhost:3010/v1/api/catalog/objects?profile=fwg-dissdb-thd"
 */
exports.v1Router.get('/api/catalog/objects', middleware_1.validateAndTransformObjectSearch, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield v1.searchObjects({ query: req.query });
        if (result.data) {
            res.status(result.status || 200).send(result.data);
        }
        else {
            throw new error_1.TransientError('No data found', 'NO_DATA');
        }
    }
    catch (err) {
        logger_1.logger.error(err);
        if (err instanceof error_1.ServerError) {
            res.status(err.status || 500).json(err.getErrorBodyJson());
        }
        else {
            const err = new error_1.ServerError('Internal Server Error', 'UNEXPECTED_ERROR');
            res.status(err.status || 500).json(err.getErrorBodyJson());
            next(err);
        }
    }
}));
/**
 * Deletes all objects associated with a given AC number from
 * the database. Requires confirmation to proceed with
 * deletion. This operation should be used with caution to
 * prevent unintended data loss. This operation is restricted
 * to administrators.
 * curl -X DELETE "http://localhost:3010/v1/api/catalog/objects?acnr=AC00026466&confirm=true"
 */
exports.v1Router.delete('/api/catalog/objects', middleware_1.validateDeleteObjects, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _b;
    const options = {
        acnr: (_b = req.query.acnr) === null || _b === void 0 ? void 0 : _b.toString(),
        confirm: req.query.confirm === 'true',
    };
    try {
        const result = yield v1.deleteObjects(options);
        res.status(result.status).send(result.data);
    }
    catch (err) {
        next(err);
    }
}));
/**
 * Retrieve Object Metadata for a given AC Record Object ID.
 * curl "http://localhost:3010/v1/api/catalog/AC00016341/objects/in-01"
 *curl "http://localhost:3010/v1/api/catalog/AC00016341/objects/10-01"
 */
exports.v1Router.get('/api/catalog/:acnr/objects/:acRecordObjectId', middleware_1.validateRetrieveMetaData, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const options = {
            acnr: req.params.acnr,
            acRecordObjectId: req.params.acRecordObjectId,
        };
        const result = yield v1.getObjectMetadata(options);
        res.status(result.status).send(result.data);
    }
    catch (err) {
        if (err.message === 'Invalid acRecordObjectId format') {
            res.status(400).json({ error: err.message });
        }
        else {
            next(err);
        }
    }
}));
/**
 * Updates an existing object in the database. This operation
 * allows for modifying object properties and replacing the
 * file if necessary. This operation is restricted to
 * administrators.
 * curl -X PATCH http://localhost:3010/v1/api/catalog/AC00016341/objects/10-02     -H "Content-Type: application/json"     -d '{"label": "Updated Label2", "belongsToAggregate": true}'
 *
 */
exports.v1Router.patch('/api/catalog/:acnr/objects/:acRecordObjectId', middleware_1.validateTransformPatchObjectMatadata, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const options = {
        body: req.body,
        acnr: req.params.acnr,
        acRecordObjectId: req.params.acRecordObjectId,
    };
    try {
        const result = yield v1.updateObjectmetadata(options);
        res.status(result.status || 200).send(result.data);
    }
    catch (err) {
        next(err);
    }
}));
/**
 * Permanently deletes an object from the database. This
 * operation requires confirmation via the 'confirm' query
 * parameter to prevent accidental deletions. This operation is
 * restricted to administrators.
 *curl -X DELETE "http://localhost:3010/v1/api/catalog/AC00016341/objects/in-01?confirm=true"
 */
exports.v1Router.delete('/api/catalog/:acnr/objects/:acRecordObjectId', middleware_1.validateDeleteObject, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const options = {
        acnr: req.params.acnr,
        acRecordObjectId: req.params.acRecordObjectId,
        confirm: req.query.confirm === 'true',
    };
    try {
        const result = yield v1.deleteObjectMetadata(options);
        res.status(result.status).send(result.data);
    }
    catch (err) {
        if (err instanceof error_1.ServerError) {
            res.status(err.status).json(err.getErrorBodyJson());
        }
        else {
            next(err);
        }
    }
}));
/**
 * Retrieves the data for a specific object identified by ACNR
 * and acRecordObjectId.
 * curl "http://localhost:3010/v1/api/catalog/AC00045373/objects/34-01/data"
 * curl "http://localhost:3010/v1/api/catalog/AC00022264/objects/40-01/data" -o data.jpg
 */
exports.v1Router.get('/api/catalog/:acnr/objects/:acRecordObjectId/data', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const options = {
        acnr: req.params['acnr'],
        acRecordObjectId: req.params['acRecordObjectId'],
    };
    try {
        const fetchResult = yield v1.fetchObjectData(options);
        if (fetchResult.status === 200) {
            const dataPath = path_1.default.join(__dirname, '../../public/data', fetchResult.data);
            res.sendFile(dataPath);
        }
        else {
            res.status(fetchResult.status).send(fetchResult.data);
        }
    }
    catch (err) {
        next(err);
    }
}));
/**
 * Uploads or updates the file for an existing object.
 * curl -X PUT "http://localhost:3010/v1/api/catalog/AC00002177/objects/10-02/data"      -F "filedata=@/home/mladen/Dokumente/10-19_Projects/edocapi-implementation/data.txt"      -H "Content-Type: multipart/form-data"
 */
exports.v1Router.put('/api/catalog/:acnr/objects/:acRecordObjectId/data', FileUpload_1.upload.single('filedata'), (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    if (!fs_1.default.existsSync(req.file.path)) {
        return res.status(404).json({ error: 'Uploaded file is missing' });
    }
    const options = {
        body: req.body,
        acnr: req.params.acnr,
        acRecordObjectId: req.params.acRecordObjectId,
        file: req.file,
    };
    try {
        const result = yield v1.uploadObjectData(options);
        res.status(result.status || 200).send(result.data);
    }
    catch (err) {
        next(err);
    }
}));
/**
 * Deletes the data associated with a specific object, both file and database record.
 */
exports.v1Router.delete('/api/catalog/:acnr/objects/:acRecordObjectId/data', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const options = {
        acnr: req.params['acnr'],
        acRecordObjectId: req.params['acRecordObjectId'],
        confirm: req.query['confirm'] === 'true',
    };
    try {
        const result = yield v1.deleteObjectData(options);
        res.status(result.status).send(result.data);
    }
    catch (err) {
        next(err);
    }
}));
/**
 * Retrieve objects for direct delivery to users based on AC
 * number, object type, and sequence number. This endpoint
 * facilitates the immediate access to specific objects,
 * streamlining the delivery process for end-users.
 * curl "http://localhost:3010/v1/api/catalog/direct-delivery?acnr=AC00048300&object_type=20&sequence=01"
 */
// TODO: correct it
exports.v1Router.get('/api/catalog/direct-delivery', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _c, _d, _e;
    const options = {
        acnr: (_c = req.query['acnr']) === null || _c === void 0 ? void 0 : _c.toString(),
        object_type: (_d = req.query['object_type']) === null || _d === void 0 ? void 0 : _d.toString(),
        sequence: (_e = req.query['sequence']) === null || _e === void 0 ? void 0 : _e.toString(),
    };
    try {
        const result = yield v1.directDelivery(options);
        if (result.status === 200) {
            const filePath = result.data.filePath; //'data/AC00048300-2001'
            const fileName = path_1.default.basename(filePath); // Extracts the file name
            // Set the Content-Disposition header
            res.setHeader('Content-Disposition', 'attachment; filename="' + fileName + '"');
            res.sendFile(filePath, {
                root: path_1.default.join(__dirname, '../../../dist/public/data'),
            });
        }
        else {
            res.status(result.status).send(result.data);
        }
    }
    catch (err) {
        next(err);
    }
}));
/**
 * Creates a new full text cache for the specified object. This
 * operation requires the necessary permissions and the
 * provision of all required data related to the object.
 *
 */
exports.v1Router.post('/api/catalog/:acnr/objects/:profile/:modifier/:sequence/full-text-cache', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _f, _g, _h, _j;
    const options = {
        body: req.body,
        acnr: (_f = req.params['acnr']) === null || _f === void 0 ? void 0 : _f.toString(),
        profile: (_g = req.params['profile']) === null || _g === void 0 ? void 0 : _g.toString(),
        sequence: (_h = req.params['sequence']) === null || _h === void 0 ? void 0 : _h.toString(),
        modifier: (_j = req.params['modifier']) === null || _j === void 0 ? void 0 : _j.toString(),
    };
    try {
        const result = yield v1.createFullTextCache(options);
        res.status(result.status || 200).send(result.data);
    }
    catch (err) {
        next(err);
    }
}));
/**
 * Retrieves the full text cache for the specified object. This
 * operation checks for the existence of the full text cache
 * and returns it if available.
 *
 */
exports.v1Router.get('/api/catalog/:acnr/objects/:profile/:modifier/:sequence/full-text-cache', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _k, _l, _m, _o;
    const options = {
        acnr: (_k = req.params['acnr']) === null || _k === void 0 ? void 0 : _k.toString(),
        profile: (_l = req.params['profile']) === null || _l === void 0 ? void 0 : _l.toString(),
        modifier: (_m = req.params['modifier']) === null || _m === void 0 ? void 0 : _m.toString(),
        sequence: (_o = req.params['sequence']) === null || _o === void 0 ? void 0 : _o.toString(),
    };
    try {
        const result = yield v1.getFullTextCache(options);
        res.status(result.status || 200).send(result.data);
    }
    catch (err) {
        next(err);
    }
}));
/**
 * Rebuilds or updates the full text cache for the specified
 * object. This is necessary when the object's content has
 * changed, ensuring the cache reflects the most current data.
 *
 */
exports.v1Router.patch('/api/catalog/:acnr/objects/:profile/:modifier/:sequence/full-text-cache', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _p, _q, _r, _s;
    const options = {
        body: req.body,
        acnr: (_p = req.params['acnr']) === null || _p === void 0 ? void 0 : _p.toString(),
        profile: (_q = req.params['profile']) === null || _q === void 0 ? void 0 : _q.toString(),
        modifier: (_r = req.params['modifier']) === null || _r === void 0 ? void 0 : _r.toString(),
        sequence: (_s = req.params['sequence']) === null || _s === void 0 ? void 0 : _s.toString(),
    };
    try {
        const result = yield v1.rebuildFullTextCache(options);
        res.status(result.status || 200).send(result.data);
    }
    catch (err) {
        next(err);
    }
}));
/**
 * Retrieves full text data for a given set of criteria and
 * extends the corresponding PNX record. This endpoint is
 * designed for integrating full text data into PNX records.
 *
 */
exports.v1Router.post('/api/catalog/pnx-fulltext', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const options = {
        body: req.body,
    };
    try {
        const result = yield v1.extendPnxWithFullText(options);
        res.status(result.status || 200).send(result.data);
    }
    catch (err) {
        next(err);
    }
}));
/**
 * Generates a report for a specific user, detailing their
 * activities and interactions with the eDoc.
 */
/* v1Router.get(
  '/api/reports/user',
  async (req: Request, res: Response, next: Function) => {
    const options = {
      userIdQuery: req.query['userIdQuery']?.toString(),
      timeRange: req.query['timeRange']?.toString(),
      activityType: req.query['activityType']?.toString(),
    };

    try {
      const result = await v1.generateUserReport(options);
      res.status(result.status || 200).send(result.data);
    } catch (err: any) {
      next(err);
    }
  },
); */
/**
 * Retrieve statistics on the types of content contributed by
 * profiles, with options to filter by time range and content
 * types.
 *
 */
exports.v1Router.get('/api/statistics/contributions', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _t, _u, _v;
    const options = {
        profileId: (_t = req.query['profileId']) === null || _t === void 0 ? void 0 : _t.toString(),
        timeRange: (_u = req.query['timeRange']) === null || _u === void 0 ? void 0 : _u.toString(),
        objectType: (_v = req.query['objectType']) === null || _v === void 0 ? void 0 : _v.toString(),
    };
    try {
        const result = yield v1.getContributionsStats(options);
        res.status(result.status || 200).send(result.data);
    }
    catch (err) {
        next(err);
    }
}));
/**
 * Retrieve statistics of web accesses to objects in the eDoc,
 * filtered by the profile.
 */
exports.v1Router.get('/api/statistics/web-access', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _w;
    const options = {
        profileId: (_w = req.query['profileId']) === null || _w === void 0 ? void 0 : _w.toString(),
    };
    try {
        const result = yield v1.getWebAccessesStats(options);
        res.status(result.status || 200).send(result.data);
    }
    catch (err) {
        next(err);
    }
}));
//# sourceMappingURL=v1-route.js.map