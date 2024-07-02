import Joi from 'joi';

// Define valid types for profileAllowedTypes
const VALID_TYPES = [
  'Inhaltsverzeichnis',
  'Klappentext',
  'Volltext',
  'Umschlagbild',
  'Bild',
];

// Joi schema for eDoc profile creation
const eDocProfileSchema = Joi.object({
  profileId: Joi.string().required(),
  isil: Joi.string()
    .pattern(/^AT-\w+$/)
    .required(),
  projectCode: Joi.string(),
  fullTextDeposit: Joi.boolean().required(),
  '865mCode': Joi.string(),
  contactEmails: Joi.array().items(Joi.string().email()).required(),
  profileAllowedTypes: Joi.array()
    .items(Joi.string().valid(...VALID_TYPES))
    .required(),
  isActive: Joi.boolean().required(),
});

// Validation validateEdocProfile function to use in routes
export const validateEDocProfile = (data: any) => {
  return eDocProfileSchema.validate(data, {abortEarly: false});
};

// Validation  for get/patch request for eDoc profile by profileId
export const validateProfileId = Joi.object({
  profileId: Joi.string()
    .required()
    .description('The unique identifier for the profile'),
});

// Validation for get request for eDoc profile by profileId
export const validateEDocProfileId = (profileId: string) => {
  return validateProfileId.validate({profileId});
};

// Validation for patch request for eDoc profile by profileId
const eDocProfileSchemaPatch = Joi.object({
  profileId: Joi.string().description('Unique identifier for the eDocProfile'),
  isil: Joi.string().description('isil identifier for library'),
  projectCode: Joi.string().description('the project code'),
  fullTextDeposit: Joi.boolean().description(
    'Indicates whether full text deposit is allowed',
  ),
  subfieldMCode: Joi.string()
    .description('the 865 subfield m code of the user')
    .optional(),
  contactEmails: Joi.array()
    .items(Joi.string().email())
    .description('One or more contact email addresses'),
  profileAllowedTypes: Joi.array()
    .items(Joi.string().valid(...VALID_TYPES))
    .description('Permitted object types for the institution'),
  isActive: Joi.boolean().description(
    'Indicates whether the profile is active',
  ),
}).min(1); // Ensure at least one field is provided for the patch operation

export const validateEDocProfilePatch = (data: any) => {
  return eDocProfileSchemaPatch.validate(data);
};

//Validation for delete request for eDoc profile by profileId
export const validateeDocProfileDelete = Joi.object({
  profileId: Joi.string()
    .required()
    .description('The unique identifier for the profile'),
  confirm: Joi.boolean().required().description('Confirm the deletion'),
});

export const validateEDocProfileDelete = (data: any) => {
  return validateeDocProfileDelete.validate(data);
};

export const validateEDocProfileListQuery = (queryParams: any) => {
  const schema = Joi.object({
    profileId: Joi.string(),
    isil: Joi.string(),
    projectCode: Joi.string(),
    fullTextDeposit: Joi.boolean(),
    subfieldMCode: Joi.string(),
    contactEmails: Joi.string(),
    profileAllowedTypes: Joi.string(),
    isActive: Joi.boolean(),
  });

  return schema.validate(queryParams);
};

export const validateUserRegistration = (userDetails: any) => {
  const schema = Joi.object({
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    username: Joi.string().required(),
    userType: Joi.string().valid('admin', 'user').required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    eDocProfiles: Joi.array().items(Joi.string()).required(),
    isActive: Joi.boolean().required(),
  });

  return schema.validate(userDetails);
};

// validate username
export const validateUsername = (username: any) => {
  const schema = Joi.object({
    username: Joi.string().required(),
  });
  return schema.validate(username);
};

//validate userpatch
export const validateUserPatch = (userDetails: any) => {
  const schema = Joi.object({
    firstName: Joi.string(),
    lastName: Joi.string(),
    username: Joi.string(),
    userType: Joi.string().valid('admin', 'user'),
    email: Joi.string().email(),
    password: Joi.string().min(6),
    eDocProfiles: Joi.array().items(Joi.string()),
    isActive: Joi.boolean(),
  });
  return schema.validate(userDetails);
};

//validate userpatch
export const validateUserPatchPassword = (userDetails: any) => {
  const schema = Joi.object({
    password: Joi.string().min(6),
  });
  return schema.validate(userDetails);
};

export const validateUserDelete = Joi.object({
  username: Joi.string().required().description('The username for the user'),
  confirm: Joi.boolean().required().description('Confirm the deletion'),
});

export const validateUserListQuery = (queryParams: any) => {
  const schema = Joi.object({
    username: Joi.string(),
    userType: Joi.string(),
    email: Joi.string(),
    eDocProfiles: Joi.string(),
  }).unknown(true); // Allows for unknown keys but does not validate them

  return schema.validate(queryParams);
};

const objectCreationSchema = Joi.object({
  acnr: Joi.string()
    .pattern(/^AC\d{8}$/)
    .required(),
  profile: Joi.string().required(),
  sequence: Joi.string(),
  objectType: Joi.string()
    .valid(
      'Inhaltsverzeichnis',
      'Klappentext',
      'Umschlagbild',
      'Bild',
      'Volltext',
    )
    .required(),
  belongsToAggregate: Joi.boolean().required(),
  label: Joi.string().required(),
  fileUrl: Joi.string().uri(),
});

export const validateObjectCreation = (data: any) => {
  return objectCreationSchema.validate(data, {abortEarly: false});
};

const searchObjectsSchema = Joi.object({
  acnr: Joi.string()
    .pattern(/^AC\d{8}$/)
    .optional(),
  isil: Joi.string().optional(),
  profile: Joi.string().optional(),
  sequence: Joi.string().optional(),
  objectType: Joi.string()
    .valid(
      'Inhaltsverzeichnis',
      'Klappentext',
      'Umschlagbild',
      'Bild',
      'Volltext',
    )
    .optional(),
  fileExtension: Joi.string().valid('pdf', 'txt', 'png', 'jpg').optional(),
  belongsToAggregate: Joi.boolean().optional(),
  label: Joi.string().optional(),
  dateRange: Joi.string().optional(),
  fileName: Joi.string().optional(),
  sortBy: Joi.string()
    .valid('acnr', 'isil', 'objectType', 'profile')
    .optional(),
  sortOrder: Joi.string().valid('asc', 'desc').optional(),
  limit: Joi.number().integer().optional(),
  page: Joi.number().integer().optional(),
});

export const validateSearchObjects = (data: any) => {
  return searchObjectsSchema.validate(data, {abortEarly: false});
};

export const objectsDeleteSchema = Joi.object({
  acnr: Joi.string()
    .pattern(/^AC\d{8}$/)
    .required()
    .description('The ACNR identifier for the objects'),
  confirm: Joi.boolean().required().description('Confirm the deletion'),
});

export const validateObjectsDelete = (data: any) => {
  return objectsDeleteSchema.validate(data, {abortEarly: false});
};

export const validateMetaDataRetrievePathParameters = Joi.object({
  acnr: Joi.string()
    .pattern(/^AC\d{8}$/)
    .required()
    .description('The ACNR identifier for the objects'),
  acRecordObjectId: Joi.string()
    .required()
    .description('The AC Record Object ID'),
});

export const validateMetaDataRetrieve = (data: any) => {
  return validateMetaDataRetrievePathParameters.validate(data);
};

export const validateAndTransformMetaDataPatch = (objectDetails: any) => {
  const schema = Joi.object({
    sequence: Joi.string(),
    objectType: Joi.string().valid(
      'Inhaltsverzeichnis',
      'Klappentext',
      'Umschlagbild',
      'Bild',
      'Volltext',
    ),
    belongsToAggregate: Joi.boolean(),
    label: Joi.string(),
    fileUrl: Joi.string().uri(),
  });
  return schema.validate(objectDetails);
};

export const validateMetaDataObjectdelete = Joi.object({
  acnr: Joi.string()
    .pattern(/^AC\d{8}$/)
    .required()
    .description('The ACNR identifier for the objects'),
  acRecordObjectId: Joi.string()
    .required()
    .description('The AC Record Object ID'),
  confirm: Joi.boolean().required().description('Confirm the deletion'),
});

export const validateObjectDelete = (data: any) => {
  return validateMetaDataObjectdelete.validate(data, {abortEarly: false});
};

export const putObjectSchema = Joi.object({
  acnr: Joi.string()
    .pattern(/^AC\d{8}$/)
    .required()
    .description('The ACNR identifier for the objects'),
  acRecordObjectId: Joi.string()
    .required()
    .description('The AC Record Object ID'),
  file: Joi.object({
    path: Joi.string().required(),
    originalname: Joi.string().required(),
    fieldname: Joi.string(), // Multer adds this
    encoding: Joi.string(), // Multer adds this
    mimetype: Joi.string(), // Multer adds this
    destination: Joi.string(), // Multer adds this
    filename: Joi.string(), // Multer adds this
    size: Joi.number().required(), // Multer adds this
  }).required(),
});

export const validatePutObject = (data: any) => {
  return putObjectSchema.validate(data, {abortEarly: false});
};
