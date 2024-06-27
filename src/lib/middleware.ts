import {Request, Response, NextFunction} from 'express';
import {mapRequestDataToDbFields} from './fieldMappings';
import {
  validateEDocProfile,
  validateEDocProfileId,
  validateEDocProfilePatch,
  validateEDocProfileDelete,
  validateEDocProfileListQuery,
  validateUserRegistration,
  validateUserPatch,
  validateUsername,
  validateUserDelete,
  validateUserListQuery,
  validateObjectCreation,
  validateSearchObjects,
  validateObjectsDelete,
  validateMetaDataRetrieve,
  validateAndTransformMetaDataPatch,
  validateObjectDelete,
} from './validation';
import {RequestError} from './error';
/**
 * Middleware to validate and transform eDoc profile request data.
 */
export async function validateAndTransformEDocProfile(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const validation = validateEDocProfile(req.body);
  if (validation.error) {
    const error = new RequestError(validation.error.details[0].message);
    return res.status(error.status).json(error.getErrorBodyJson());
  }

  // Transform the request data from camelCase/API format to snake_case/DB format
  req.body = mapRequestDataToDbFields(req.body);
  next();
}

/**
 * Middleware to validate eDoc profile request data.
 */
export async function validateGetProfile(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const validation = validateEDocProfileId(req.params.profileId);
  if (validation.error) {
    const error = new RequestError(validation.error.details[0].message);
    return res.status(error.status).json(error.getErrorBodyJson());
  }
  next();
}

/**
 * Middleware to validate and process patch requests for eDoc profiles.
 *
 * @param {Request} req - The request object
 * @param {Response} res - The response object
 * @param {NextFunction} next - The next middleware function
 */
export async function validateAndTransformPatchProfile(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const validation = validateEDocProfilePatch(req.body);
  if (validation.error) {
    const error = new RequestError(validation.error.details[0].message);
    return res.status(error.status).json(error.getErrorBodyJson());
  }

  // Transform the request data from camelCase/API format to snake_case/DB format
  req.body = mapRequestDataToDbFields(req.body);
  next();
}

/**
 * Validates the deletion of an eDoc profile based on the request parameters and query string.
 */
export async function validateDeleteProfile(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const validation = validateEDocProfileDelete({
    profileId: req.params.profileId,
    confirm: req.query.confirm === 'true',
  });
  if (validation.error) {
    const error = new RequestError(validation.error.details[0].message);
    return res.status(error.status).json(error.getErrorBodyJson());
  }
  next();
}

/**
 *
 */
export async function validateAndTransformEDocProfileListQuery(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const validation = validateEDocProfileListQuery(req.query);
  if (validation.error) {
    const error = new RequestError(validation.error.details[0].message);
    return res.status(error.status).json(error.getErrorBodyJson());
  }

  // Apply field mappings and type conversions
  const mappedQuery = mapRequestDataToDbFields(req.query);
  const transformedQuery: {[key: string]: any} = {};

  Object.entries(mappedQuery).forEach(([key, value]) => {
    // Handle boolean conversions
    if (key === 'is_active' || key === 'full_text_deposit') {
      transformedQuery[key] =
        value === 'true' ? true : value === 'false' ? false : value;
    } else if (key === 'profile_allowed_types' && typeof value === 'string') {
      // Split and trim the allowed types if they're in string form
      transformedQuery[key] = value
        .split(',')
        .map((type: string) => type.trim());
    } else {
      transformedQuery[key] = value;
    }
  });

  req.query = transformedQuery;
  next();
}

/**
 *
 */
export async function validateAndTransformedUserRegistration(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const validation = validateUserRegistration(req.body);
  if (validation.error) {
    const error = new RequestError(validation.error.details[0].message);
    return res.status(error.status).json(error.getErrorBodyJson());
  }

  // Transform the request data from camelCase/API format to snake_case/DB format
  req.body = mapRequestDataToDbFields(req.body);
  next();
}

/**
 *
 */
export async function validateAndTransformPatchUser(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const validation = validateUserPatch(req.body);

  if (validation.error) {
    const error = new RequestError(validation.error.details[0].message);
    return res.status(error.status).json(error.getErrorBodyJson());
  }

  // Transform the request data from camelCase/API format to snake_case/DB format
  req.body = mapRequestDataToDbFields(req.body);
  next();
}

/**
 *
 */
export async function validateUser(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const usernameValidation = validateUsername(req.params);

  if (usernameValidation.error) {
    const error = new RequestError(usernameValidation.error.details[0].message);
    return res.status(error.status).json(error.getErrorBodyJson());
  }

  next();
}

/**
 *
 */
export async function validateUserDeleting(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const validate = validateUserDelete.validate({
    username: req.params.username,
    confirm: req.query.confirm === 'true',
  });

  if (validate.error) {
    const error = new RequestError(validate.error.details[0].message);
    return res.status(error.status).json(error.getErrorBodyJson());
  }

  next();
}

/**
 *
 */
export async function validateAndTransformedUserListQuery(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const validation = validateUserListQuery(req.query);
  if (validation.error) {
    const error = new RequestError(validation.error.details[0].message);
    return res.status(error.status).json(error.getErrorBodyJson());
  }

  // Apply field mappings and type conversions
  const mappedQuery = mapRequestDataToDbFields(req.query);
  const transformedQuery: {[key: string]: any} = {};

  Object.entries(mappedQuery).forEach(([key, value]) => {
    // Specific handling for eDocProfiles field in the query
    // here we map it to p.unique_profile_id
    if (key === 'eDocProfiles') {
      transformedQuery['p.unique_profile_id'] = value;
    } else if (key === 'is_active') {
      // convert boolean values for is_active
      transformedQuery[key] = value === 'true' ? true : false;
    } else {
      // apply all other mappings as usual
      transformedQuery[key] = value;
    }
  });

  req.query = transformedQuery;
  next();
}

/**
 *
 */
export async function validateAndTransformObjectCreation(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const validation = validateObjectCreation(req.body);
  if (validation.error) {
    const error = new RequestError(validation.error.details[0].message);
    return res.status(error.status).json(error.getErrorBodyJson());
  }

  // Transform the request data from camelCase/API format to snake_case/DB format
  req.body = mapRequestDataToDbFields(req.body);
  next();
}

/**
 *
 */
export async function validateAndTransformObjectSearch(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const validation = validateSearchObjects(req.query);
  if (validation.error) {
    const error = new RequestError(validation.error.details[0].message);
    return res.status(error.status).json(error.getErrorBodyJson());
  }

  const mappedQuery = mapRequestDataToDbFields(req.query);

  const transformedQuery: {[key: string]: any} = {};
  Object.entries(mappedQuery).forEach(([key, value]) => {
    transformedQuery[key] = value;
  });
  req.query = transformedQuery;
  next();
}

/**
 *
 */
export async function validateDeleteObjects(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const validation = validateObjectsDelete({
    acnr: req.query.acnr,
    confirm: req.query.confirm === 'true',
  });
  if (validation.error) {
    const error = new RequestError(validation.error.details[0].message);
    return res.status(error.status).json(error.getErrorBodyJson());
  }
  next();
}

/**
 *
 */
export async function validateRetrieveMetaData(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const validation = validateMetaDataRetrieve(req.params);
  if (validation.error) {
    const error = new RequestError(validation.error.details[0].message);
    return res.status(error.status).json(error.getErrorBodyJson());
  }
  next();
}

/**
 *
 */
export async function validateTransformPatchObjectMatadata(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const validation = validateAndTransformMetaDataPatch(req.body);
  if (validation.error) {
    const error = new RequestError(validation.error.details[0].message);
    return res.status(error.status).json(error.getErrorBodyJson());
  }

  // Transform the request data from camelCase/API format to snake_case/DB format
  req.body = mapRequestDataToDbFields(req.body);
  next();
}

/**
 *
 */
export async function validateDeleteObject(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const validation = validateObjectDelete({
    acnr: req.params.acnr,
    acRecordObjectId: req.params.acRecordObjectId,
    confirm: req.query.confirm, // Use req.query here
  });
  if (validation.error) {
    const error = new RequestError(validation.error.details[0].message);
    return res.status(error.status).json(error.getErrorBodyJson());
  }
  next();
}
