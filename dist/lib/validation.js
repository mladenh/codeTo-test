"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateObjectDelete = exports.validateMetaDataObjectdelete = exports.validateAndTransformMetaDataPatch = exports.validateMetaDataRetrieve = exports.validateMetaDataRetrievePathParameters = exports.validateObjectsDelete = exports.objectsDeleteSchema = exports.validateSearchObjects = exports.validateObjectCreation = exports.validateUserListQuery = exports.validateUserDelete = exports.validateUserPatchPassword = exports.validateUserPatch = exports.validateUsername = exports.validateUserRegistration = exports.validateEDocProfileListQuery = exports.validateEDocProfileDelete = exports.validateeDocProfileDelete = exports.validateEDocProfilePatch = exports.validateEDocProfileId = exports.validateProfileId = exports.validateEDocProfile = void 0;
const joi_1 = __importDefault(require("joi"));
// Define valid types for profileAllowedTypes
const VALID_TYPES = [
    'Inhaltsverzeichnis',
    'Klappentext',
    'Volltext',
    'Umschlagbild',
    'Bild',
];
// Joi schema for eDoc profile creation
const eDocProfileSchema = joi_1.default.object({
    profileId: joi_1.default.string().required(),
    isil: joi_1.default.string()
        .pattern(/^AT-\w+$/)
        .required(),
    projectCode: joi_1.default.string(),
    fullTextDeposit: joi_1.default.boolean().required(),
    '865mCode': joi_1.default.string(),
    contactEmails: joi_1.default.array().items(joi_1.default.string().email()).required(),
    profileAllowedTypes: joi_1.default.array()
        .items(joi_1.default.string().valid(...VALID_TYPES))
        .required(),
    isActive: joi_1.default.boolean().required(),
});
// Validation validateEdocProfile function to use in routes
const validateEDocProfile = (data) => {
    return eDocProfileSchema.validate(data, { abortEarly: false });
};
exports.validateEDocProfile = validateEDocProfile;
// Validation  for get/patch request for eDoc profile by profileId
exports.validateProfileId = joi_1.default.object({
    profileId: joi_1.default.string()
        .required()
        .description('The unique identifier for the profile'),
});
// Validation for get request for eDoc profile by profileId
const validateEDocProfileId = (profileId) => {
    return exports.validateProfileId.validate({ profileId });
};
exports.validateEDocProfileId = validateEDocProfileId;
// Validation for patch request for eDoc profile by profileId
const eDocProfileSchemaPatch = joi_1.default.object({
    profileId: joi_1.default.string().description('Unique identifier for the eDocProfile'),
    isil: joi_1.default.string().description('isil identifier for library'),
    projectCode: joi_1.default.string().description('the project code'),
    fullTextDeposit: joi_1.default.boolean().description('Indicates whether full text deposit is allowed'),
    subfieldMCode: joi_1.default.string()
        .description('the 865 subfield m code of the user')
        .optional(),
    contactEmails: joi_1.default.array()
        .items(joi_1.default.string().email())
        .description('One or more contact email addresses'),
    profileAllowedTypes: joi_1.default.array()
        .items(joi_1.default.string().valid(...VALID_TYPES))
        .description('Permitted object types for the institution'),
    isActive: joi_1.default.boolean().description('Indicates whether the profile is active'),
}).min(1); // Ensure at least one field is provided for the patch operation
const validateEDocProfilePatch = (data) => {
    return eDocProfileSchemaPatch.validate(data);
};
exports.validateEDocProfilePatch = validateEDocProfilePatch;
//Validation for delete request for eDoc profile by profileId
exports.validateeDocProfileDelete = joi_1.default.object({
    profileId: joi_1.default.string()
        .required()
        .description('The unique identifier for the profile'),
    confirm: joi_1.default.boolean().required().description('Confirm the deletion'),
});
const validateEDocProfileDelete = (data) => {
    return exports.validateeDocProfileDelete.validate(data);
};
exports.validateEDocProfileDelete = validateEDocProfileDelete;
const validateEDocProfileListQuery = (queryParams) => {
    const schema = joi_1.default.object({
        profileId: joi_1.default.string(),
        isil: joi_1.default.string(),
        projectCode: joi_1.default.string(),
        fullTextDeposit: joi_1.default.boolean(),
        subfieldMCode: joi_1.default.string(),
        contactEmails: joi_1.default.string(),
        profileAllowedTypes: joi_1.default.string(),
        isActive: joi_1.default.boolean(),
    });
    return schema.validate(queryParams);
};
exports.validateEDocProfileListQuery = validateEDocProfileListQuery;
const validateUserRegistration = (userDetails) => {
    const schema = joi_1.default.object({
        firstName: joi_1.default.string().required(),
        lastName: joi_1.default.string().required(),
        username: joi_1.default.string().required(),
        userType: joi_1.default.string().valid('admin', 'user').required(),
        email: joi_1.default.string().email().required(),
        password: joi_1.default.string().min(6).required(),
        eDocProfiles: joi_1.default.array().items(joi_1.default.string()).required(),
        isActive: joi_1.default.boolean().required(),
    });
    return schema.validate(userDetails);
};
exports.validateUserRegistration = validateUserRegistration;
// validate username
const validateUsername = (username) => {
    const schema = joi_1.default.object({
        username: joi_1.default.string().required(),
    });
    return schema.validate(username);
};
exports.validateUsername = validateUsername;
//validate userpatch
const validateUserPatch = (userDetails) => {
    const schema = joi_1.default.object({
        firstName: joi_1.default.string(),
        lastName: joi_1.default.string(),
        username: joi_1.default.string(),
        userType: joi_1.default.string().valid('admin', 'user'),
        email: joi_1.default.string().email(),
        password: joi_1.default.string().min(6),
        eDocProfiles: joi_1.default.array().items(joi_1.default.string()),
        isActive: joi_1.default.boolean(),
    });
    return schema.validate(userDetails);
};
exports.validateUserPatch = validateUserPatch;
//validate userpatch
const validateUserPatchPassword = (userDetails) => {
    const schema = joi_1.default.object({
        password: joi_1.default.string().min(6),
    });
    return schema.validate(userDetails);
};
exports.validateUserPatchPassword = validateUserPatchPassword;
exports.validateUserDelete = joi_1.default.object({
    username: joi_1.default.string().required().description('The username for the user'),
    confirm: joi_1.default.boolean().required().description('Confirm the deletion'),
});
const validateUserListQuery = (queryParams) => {
    const schema = joi_1.default.object({
        username: joi_1.default.string(),
        userType: joi_1.default.string(),
        email: joi_1.default.string(),
        eDocProfiles: joi_1.default.string(),
    }).unknown(true); // Allows for unknown keys but does not validate them
    return schema.validate(queryParams);
};
exports.validateUserListQuery = validateUserListQuery;
const objectCreationSchema = joi_1.default.object({
    acnr: joi_1.default.string()
        .pattern(/^AC[0-9]{8}$/)
        .required(),
    profile: joi_1.default.string().required(),
    sequence: joi_1.default.string(),
    objectType: joi_1.default.string()
        .valid('Inhaltsverzeichnis', 'Klappentext', 'Umschlagbild', 'Bild', 'Volltext')
        .required(),
    belongsToAggregate: joi_1.default.boolean().required(),
    label: joi_1.default.string().required(),
    fileUrl: joi_1.default.string().uri(),
});
const validateObjectCreation = (data) => {
    return objectCreationSchema.validate(data, { abortEarly: false });
};
exports.validateObjectCreation = validateObjectCreation;
const searchObjectsSchema = joi_1.default.object({
    acnr: joi_1.default.string()
        .pattern(/^AC[0-9]{8}$/)
        .optional(),
    isil: joi_1.default.string().optional(),
    profile: joi_1.default.string().optional(),
    sequence: joi_1.default.string().optional(),
    objectType: joi_1.default.string()
        .valid('Inhaltsverzeichnis', 'Klappentext', 'Umschlagbild', 'Bild', 'Volltext')
        .optional(),
    fileExtension: joi_1.default.string().valid('pdf', 'txt', 'png', 'jpg').optional(),
    belongsToAggregate: joi_1.default.boolean().optional(),
    label: joi_1.default.string().optional(),
    dateRange: joi_1.default.string().optional(),
    fileName: joi_1.default.string().optional(),
    sortBy: joi_1.default.string()
        .valid('acnr', 'isil', 'objectType', 'profile')
        .optional(),
    sortOrder: joi_1.default.string().valid('asc', 'desc').optional(),
    limit: joi_1.default.number().integer().optional(),
    page: joi_1.default.number().integer().optional(),
});
const validateSearchObjects = (data) => {
    return searchObjectsSchema.validate(data, { abortEarly: false });
};
exports.validateSearchObjects = validateSearchObjects;
exports.objectsDeleteSchema = joi_1.default.object({
    acnr: joi_1.default.string()
        .pattern(/^AC[0-9]{8}$/)
        .required()
        .description('The ACNR identifier for the objects'),
    confirm: joi_1.default.boolean().required().description('Confirm the deletion'),
});
const validateObjectsDelete = (data) => {
    return exports.objectsDeleteSchema.validate(data, { abortEarly: false });
};
exports.validateObjectsDelete = validateObjectsDelete;
exports.validateMetaDataRetrievePathParameters = joi_1.default.object({
    acnr: joi_1.default.string()
        .pattern(/^AC[0-9]{8}$/)
        .required()
        .description('The ACNR identifier for the objects'),
    acRecordObjectId: joi_1.default.string()
        .required()
        .description('The AC Record Object ID'),
});
const validateMetaDataRetrieve = (data) => {
    return exports.validateMetaDataRetrievePathParameters.validate(data);
};
exports.validateMetaDataRetrieve = validateMetaDataRetrieve;
const validateAndTransformMetaDataPatch = (objectDetails) => {
    const schema = joi_1.default.object({
        sequence: joi_1.default.string(),
        objectType: joi_1.default.string().valid('Inhaltsverzeichnis', 'Klappentext', 'Umschlagbild', 'Bild', 'Volltext'),
        belongsToAggregate: joi_1.default.boolean(),
        label: joi_1.default.string(),
        fileUrl: joi_1.default.string().uri(),
    });
    return schema.validate(objectDetails);
};
exports.validateAndTransformMetaDataPatch = validateAndTransformMetaDataPatch;
exports.validateMetaDataObjectdelete = joi_1.default.object({
    acnr: joi_1.default.string()
        .pattern(/^AC[0-9]{8}$/)
        .required()
        .description('The ACNR identifier for the objects'),
    acRecordObjectId: joi_1.default.string()
        .required()
        .description('The AC Record Object ID'),
    confirm: joi_1.default.boolean().required().description('Confirm the deletion'),
});
const validateObjectDelete = (data) => {
    return exports.validateMetaDataObjectdelete.validate(data, { abortEarly: false });
};
exports.validateObjectDelete = validateObjectDelete;
//# sourceMappingURL=validation.js.map