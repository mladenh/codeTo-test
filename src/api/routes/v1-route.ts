import type {components, operations} from '../../../types.d.ts';
import {Router, Request, Response} from 'express';
import * as v1 from '../services/v1';
import {logger} from '../../lib/logger';
import {Options} from '../../lib/objects';
import {logAuditTrail} from '../../lib/auditTrail';
import path from 'path';
import {
  validateAndTransformEDocProfile,
  validateGetProfile,
  validateAndTransformPatchProfile,
  validateDeleteProfile,
  validateAndTransformEDocProfileListQuery,
  validateAndTransformedUserRegistration,
  validateAndTransformPatchUser,
  validateUser,
  validateUserDeleting,
  validateAndTransformedUserListQuery,
  validateAndTransformObjectCreation,
  validateAndTransformObjectSearch,
  validateDeleteObjects,
  validateRetrieveMetaData,
  validateTransformPatchObjectMatadata,
  validateDeleteObject,
  validateObjectPut,
} from '../../lib/middleware';
import {upload} from '../../lib/FileUpload';
import {TransientError, ServerError} from '../../lib/error';
export const v1Router = Router();

/**
 * Creates a new eDoc profile and requires providing a complete
 * profile definition. The profile includes profileId,  Isil
 * code, project code and other relevant information.
 *curl -X POST http://localhost:3010/v1/api/users/eDocProfile -H "Content-Type: application/json" -d '{"profileId":"TEST2", "isil":"AT-TEST", "projectCode":"OBV-EDOC", "fullTextDeposit":true, "865mCode":"AT-OBV", "contactEmails":["test4@mail.at"],"profileAllowedTypes":["Inhaltsverzeichnis", "Volltext"], "isActive":true}'
 */
v1Router.post(
  '/api/users/edocprofile',
  validateAndTransformEDocProfile,
  async (req: Request, res: Response, next: Function) => {
    try {
      const profileData =
        req.body as operations['createEDocProfile']['requestBody']['content']['application/json'];
      const result = await v1.createEDocProfile({
        body: profileData,
      });
      /*
      logAuditTrail({
        profile_id: 1,
        user_id: 1,
        action: req.method + ' ' + req.originalUrl + ' ' + result.status,
        object_id: 111,
      }); */
      res.status(result.status || 200).send(result.data);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Retrieves the eDoc profile associated with the authenticated
 * user. Users can only access their own profiles unless
 * they have administrative privileges to view others.
 * curl -X GET "http://localhost:3010/v1/api/users/edocprofile/wuw"
 */
v1Router.get(
  '/api/users/edocprofile/:profileId',
  validateGetProfile,
  async (req: Request, res: Response, next: Function) => {
    const profileId = req.params.profileId;

    try {
      const result = await v1.getEDocProfile({profileId});
      if (result.status === 200) {
        res.status(200).send(result.data);
      } else {
        res.status(result.status).send(result.data);
      }
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Updates an existing eDoc profile for the authenticated user,
 * including changing the activation status. This operation
 * allows administrators to modify profile details and activate
 * or deactivate their profile.
 * curl -X PATCH http://localhost:3010/v1/api/users/edocprofile/TEST23 -H "Content-Type: application/json" -d '{"fullTextDeposit":true, "profileAllowedTypes":["Inhaltsverzeichnis", "Volltext"]}'
 */
v1Router.patch(
  '/api/users/edocprofile/:profileId',
  validateGetProfile,
  validateAndTransformPatchProfile,
  async (req: Request, res: Response, next: Function) => {
    const profileId = req.params.profileId;
    const profileData = req.body as components['schemas']['eDocProfile'];
    try {
      const result = await v1.updateEDocProfile({
        profileId,
        profileData,
      });
      res.status(result.status || 204).send(result.data);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Deletes an existing eDoc profile identified by the profileId parameter. This
 * operation should be restricted to administrators. It
 * permanently removes the profile and its associated data from
 * the system.
 *curl -X DELETE http://localhost:3010/v1/api/users/edocprofile/TEST2?confirm=true
 */
v1Router.delete(
  '/api/users/edocprofile/:profileId',
  validateDeleteProfile,
  async (req: Request, res: Response, next: Function) => {
    const profileId = req.params.profileId;
    const confirm = req.query.confirm === 'true'; // Confirm must be explicitly true

    if (!confirm) {
      // Handle the case where deletion is not confirmed
      return res.status(400).json({
        error: 'Confirmation required for deletion.',
      });
    }

    try {
      await v1.deleteEDocProfile({path: {profileId}, query: {confirm}});
      res.status(204).send(); // As per the operations interface, no content is sent on successful deletion
    } catch (err) {
      next(err);
    }
  },
);

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
v1Router.get(
  '/api/users/edocprofiles',
  validateAndTransformEDocProfileListQuery,
  async (req: Request, res: Response, next: Function) => {
    try {
      const result = await v1.listEDocProfiles({query: req.query});
      if (result.data) {
        res.status(result.status || 200).send(result.data);
      } else {
        throw new TransientError('No data found', 'NO_DATA');
      }
    } catch (err) {
      logger.error(err);
      if (err instanceof ServerError) {
        res.status(err.status || 500).json(err.getErrorBodyJson());
      } else {
        const err = new ServerError(
          'Internal Server Error',
          'UNEXPECTED_ERROR',
        );
        res.status(err.status || 500).json(err.getErrorBodyJson());
        next(err);
      }
    }
  },
);

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
v1Router.post(
  '/api/users/register',
  validateAndTransformedUserRegistration,
  async (req: Request, res: Response, next: Function) => {
    try {
      const result = await v1.registerUser({
        body: req.body,
      });
      res.status(result.status || 200).send(result.data);
    } catch (error) {
      const serverError = new ServerError(
        'Internal Server Error',
        'UNEXPECTED_ERROR',
        500,
      );
      next(serverError);
    }
  },
);

/**
 * Authenticates a user and returns a session token. The login
 * requires a valid username.
 * curl -X POST http://localhost:3010/v1/api/users/login -H "Content-Type: application/json" -d '{"username":"TestUserName2"}'
 */
//TODO: use authentication
v1Router.post(
  '/api/users/login',
  async (req: Request, res: Response, next: Function) => {
    const options = {
      body: req.body,
    };

    try {
      const result = await v1.loginUser(options);
      res.status(result.status || 200).send(result.data);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Updates the information of an existing user. This endpoint
 * allows users to update their own profile information.
 * curl -X PATCH http://localhost:3010/v1/api/users/TestFirstName -H "Content-Type: application/json" -d '{"firstName":"FirstName", "userType":"admin"}'
 */
v1Router.patch(
  '/api/users/:username',
  validateUser,
  validateAndTransformPatchUser,
  async (req: Request, res: Response, next: Function) => {
    try {
      const result = await v1.updateUser({
        body: req.body,
        username: req.params.username,
      });
      res.status(result.status || 204).send(result.data);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Deletes an existing user.
 * curl -X DELETE http://localhost:3010/v1/api/users/TestUserName2?confirm=true
 */
v1Router.delete(
  '/api/users/:username',
  validateUserDeleting,
  async (req: Request, res: Response, next: Function) => {
    const options = {
      username: req.params['username']?.toString(),
      confirm: req.query.confirm === 'true',
    };

    try {
      const result = await v1.deleteUser(options);
      res.status(result.status).send(result.data);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Retrieves the profile information for a specified user. This
 * endpoint is accessible to the user themselves or an
 * administrator.
 * curl -X GET "http://localhost:3010/v1/api/users/mcuelo/profile"
 */
v1Router.get(
  '/api/users/:username/profile',
  validateUser,
  async (req: Request, res: Response, next: Function) => {
    const options: Options = {
      username: req.params.username,
    };

    try {
      const result = await v1.getUser(options);

      if (result.data) {
        res.status(200).json(result.data);
      } else {
        res.status(404).json({error: 'User not found'});
      }
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Retrieves a list of users based on provided search criteria.
 * This operation is intended for administrators. Supports
 * filtering based on user attributes like username, user type,
 * and email.
 * curl "http://localhost:3010/v1/api/users?isActive=false"
 */
v1Router.get(
  '/api/users',
  validateAndTransformedUserListQuery,
  async (req: Request, res: Response, next: Function) => {
    try {
      const result = await v1.listUsers({query: req.query});
      if (result.data) {
        res.status(result.status || 200).send(result.data);
      } else {
        throw new TransientError('No data found', 'NO_DATA');
      }
    } catch (err) {
      logger.error(err);
      if (err instanceof ServerError) {
        res.status(err.status || 500).json(err.getErrorBodyJson());
      } else {
        const err = new ServerError(
          'Internal Server Error',
          'UNEXPECTED_ERROR',
        );
        res.status(err.status || 500).json(err.getErrorBodyJson());
        next(err);
      }
    }
  },
);

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
v1Router.post(
  '/api/catalog/objects',
  validateAndTransformObjectCreation,
  async (req: Request, res: Response, next: Function) => {
    try {
      const result = await v1.createObject({
        body: req.body,
      });
      res.status(result.status).send(result.data);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Searches for objects in the database using various criteria
 * such as ACNR, profile, modifier, sequence, object type, and
 * file extension. Supports sorting, pagination, and filtering.
 * curl "http://localhost:3010/v1/api/catalog/objects?profile=fwg-dissdb-thd"
 */
v1Router.get(
  '/api/catalog/objects',
  validateAndTransformObjectSearch,
  async (req: Request, res: Response, next: Function) => {
    try {
      const result = await v1.searchObjects({query: req.query});
      if (result.data) {
        res.status(result.status || 200).send(result.data);
      } else {
        throw new TransientError('No data found', 'NO_DATA');
      }
    } catch (err: any) {
      logger.error(err);
      if (err instanceof ServerError) {
        res.status(err.status || 500).json(err.getErrorBodyJson());
      } else {
        const err = new ServerError(
          'Internal Server Error',
          'UNEXPECTED_ERROR',
        );
        res.status(err.status || 500).json(err.getErrorBodyJson());
        next(err);
      }
    }
  },
);

/**
 * Deletes all objects associated with a given AC number from
 * the database. Requires confirmation to proceed with
 * deletion. This operation should be used with caution to
 * prevent unintended data loss. This operation is restricted
 * to administrators.
 * curl -X DELETE "http://localhost:3010/v1/api/catalog/objects?acnr=AC00026466&confirm=true"
 */
v1Router.delete(
  '/api/catalog/objects',
  validateDeleteObjects,
  async (req: Request, res: Response, next: Function) => {
    const options = {
      acnr: req.query.acnr?.toString(),
      confirm: req.query.confirm === 'true',
    };
    try {
      const result = await v1.deleteObjects(options);
      res.status(result.status).send(result.data);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Retrieve Object Metadata for a given AC Record Object ID.
 * curl "http://localhost:3010/v1/api/catalog/AC00016341/objects/in-01"
 *curl "http://localhost:3010/v1/api/catalog/AC00016341/objects/10-01"
 */
v1Router.get(
  '/api/catalog/:acnr/objects/:acRecordObjectId',
  validateRetrieveMetaData,
  async (req: Request, res: Response, next: Function) => {
    try {
      const options = {
        acnr: req.params.acnr,
        acRecordObjectId: req.params.acRecordObjectId,
      };

      const result = await v1.getObjectMetadata(options);
      res.status(result.status).send(result.data);
    } catch (err: Error | any) {
      if (err.message === 'Invalid acRecordObjectId format') {
        res.status(400).json({error: err.message});
      } else {
        next(err);
      }
    }
  },
);

/**
 * Updates an existing object in the database. This operation
 * allows for modifying object properties and replacing the
 * file if necessary. This operation is restricted to
 * administrators.
 * curl -X PATCH http://localhost:3010/v1/api/catalog/AC00016341/objects/10-02     -H "Content-Type: application/json"     -d '{"label": "Updated Label2", "belongsToAggregate": true}'
 *
 */
v1Router.patch(
  '/api/catalog/:acnr/objects/:acRecordObjectId',
  validateTransformPatchObjectMatadata,
  async (req: Request, res: Response, next: Function) => {
    const options: Options = {
      body: req.body,
      acnr: req.params.acnr,
      acRecordObjectId: req.params.acRecordObjectId,
    };

    try {
      const result = await v1.updateObjectmetadata(options);
      res.status(result.status || 200).send(result.data);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Permanently deletes an object from the database. This
 * operation requires confirmation via the 'confirm' query
 * parameter to prevent accidental deletions. This operation is
 * restricted to administrators.
 *curl -X DELETE "http://localhost:3010/v1/api/catalog/AC00016341/objects/in-01?confirm=true"
 */
v1Router.delete(
  '/api/catalog/:acnr/objects/:acRecordObjectId',
  validateDeleteObject,
  async (req: Request, res: Response, next: Function) => {
    const options: Options = {
      acnr: req.params.acnr,
      acRecordObjectId: req.params.acRecordObjectId,
      confirm: req.query.confirm === 'true',
    };

    try {
      const result = await v1.deleteObjectMetadata(options);
      res.status(result.status).send(result.data);
    } catch (err) {
      if (err instanceof ServerError) {
        res.status(err.status).json(err.getErrorBodyJson());
      } else {
        next(err);
      }
    }
  },
);

/**
 * Retrieves the data for a specific object identified by ACNR
 * and acRecordObjectId.
 * curl "http://localhost:3010/v1/api/catalog/AC00045373/objects/34-01/data"
 * curl "http://localhost:3010/v1/api/catalog/AC00022264/objects/40-01/data" -o data.jpg
 */
v1Router.get(
  '/api/catalog/:acnr/objects/:acRecordObjectId/data',
  validateRetrieveMetaData,
  async (req: Request, res: Response, next: Function) => {
    const options = {
      acnr: req.params['acnr'],
      acRecordObjectId: req.params['acRecordObjectId'],
    };

    try {
      const fetchResult = await v1.fetchObjectData(options);
      if (fetchResult.status === 200) {
        const dataPath = path.join(
          __dirname,
          '../../public/data',
          fetchResult.data,
        );
        res.sendFile(dataPath);
      } else {
        res.status(fetchResult.status).send(fetchResult.data);
      }
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Uploads or updates the file for an existing object.
 * curl -X PUT "http://localhost:3010/v1/api/catalog/AC00002177/objects/10-02/data"      -F "filedata=@/home/mladen/Dokumente/10-19_Projects/edocapi-implementation/data.txt"      -H "Content-Type: multipart/form-data"
 */
v1Router.put(
  '/api/catalog/:acnr/objects/:acRecordObjectId/data',
  upload.single('filedata'),
  validateObjectPut,
  async (req: Request, res: Response, next: Function) => {
    const options = {
      acnr: req.params.acnr,
      acRecordObjectId: req.params.acRecordObjectId,
      file: req.file,
    };

    try {
      const result = await v1.uploadObjectData(options);
      res.status(result.status || 200).send(result.data);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Deletes the data associated with a specific object, both file and database record.
 */
v1Router.delete(
  '/api/catalog/:acnr/objects/:acRecordObjectId/data',
  validateDeleteObject,
  async (req: Request, res: Response, next: Function) => {
    const options = {
      acnr: req.params['acnr'],
      acRecordObjectId: req.params['acRecordObjectId'],
      confirm: req.query['confirm'] === 'true',
    };

    try {
      const result = await v1.deleteObjectData(options);
      res.status(result.status).send(result.data);
    } catch (err: any) {
      next(err);
    }
  },
);

/**
 * Retrieve objects for direct delivery to users based on AC
 * number, object type, and sequence number. This endpoint
 * facilitates the immediate access to specific objects,
 * streamlining the delivery process for end-users.
 * curl "http://localhost:3010/v1/api/catalog/direct-delivery?acnr=AC00048300&object_type=20&sequence=01"
 */
// TODO: correct it
v1Router.get(
  '/api/catalog/direct-delivery',
  async (req: Request, res: Response, next: Function) => {
    const options = {
      acnr: req.query['acnr']?.toString(),
      object_type: req.query['object_type']?.toString(),
      sequence: req.query['sequence']?.toString(),
    };

    try {
      const result = await v1.directDelivery(options);
      if (result.status === 200) {
        const filePath = result.data.filePath; //'data/AC00048300-2001'
        const fileName = path.basename(filePath); // Extracts the file name

        // Set the Content-Disposition header
        res.setHeader(
          'Content-Disposition',
          'attachment; filename="' + fileName + '"',
        );

        res.sendFile(filePath, {
          root: path.join(__dirname, '../../../dist/public/data'),
        });
      } else {
        res.status(result.status).send(result.data);
      }
    } catch (err: any) {
      next(err);
    }
  },
);

/**
 * Creates a new full text cache for the specified object. This
 * operation requires the necessary permissions and the
 * provision of all required data related to the object.
 *
 */
v1Router.post(
  '/api/catalog/:acnr/objects/:profile/:modifier/:sequence/full-text-cache',
  async (req: Request, res: Response, next: Function) => {
    const options = {
      body: req.body,
      acnr: req.params['acnr']?.toString(),
      profile: req.params['profile']?.toString(),
      sequence: req.params['sequence']?.toString(),
      modifier: req.params['modifier']?.toString(),
    };

    try {
      const result = await v1.createFullTextCache(options);
      res.status(result.status || 200).send(result.data);
    } catch (err: any) {
      next(err);
    }
  },
);

/**
 * Retrieves the full text cache for the specified object. This
 * operation checks for the existence of the full text cache
 * and returns it if available.
 *
 */
v1Router.get(
  '/api/catalog/:acnr/objects/:profile/:modifier/:sequence/full-text-cache',
  async (req: Request, res: Response, next: Function) => {
    const options = {
      acnr: req.params['acnr']?.toString(),
      profile: req.params['profile']?.toString(),
      modifier: req.params['modifier']?.toString(),
      sequence: req.params['sequence']?.toString(),
    };

    try {
      const result = await v1.getFullTextCache(options);
      res.status(result.status || 200).send(result.data);
    } catch (err: any) {
      next(err);
    }
  },
);

/**
 * Rebuilds or updates the full text cache for the specified
 * object. This is necessary when the object's content has
 * changed, ensuring the cache reflects the most current data.
 *
 */
v1Router.patch(
  '/api/catalog/:acnr/objects/:profile/:modifier/:sequence/full-text-cache',
  async (req: Request, res: Response, next: Function) => {
    const options = {
      body: req.body,
      acnr: req.params['acnr']?.toString(),
      profile: req.params['profile']?.toString(),
      modifier: req.params['modifier']?.toString(),
      sequence: req.params['sequence']?.toString(),
    };

    try {
      const result = await v1.rebuildFullTextCache(options);
      res.status(result.status || 200).send(result.data);
    } catch (err: any) {
      next(err);
    }
  },
);

/**
 * Retrieves full text data for a given set of criteria and
 * extends the corresponding PNX record. This endpoint is
 * designed for integrating full text data into PNX records.
 *
 */
v1Router.post(
  '/api/catalog/pnx-fulltext',
  async (req: Request, res: Response, next: Function) => {
    const options = {
      body: req.body,
    };

    try {
      const result = await v1.extendPnxWithFullText(options);
      res.status(result.status || 200).send(result.data);
    } catch (err: any) {
      next(err);
    }
  },
);

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
v1Router.get(
  '/api/statistics/contributions',
  async (req: Request, res: Response, next: Function) => {
    const options = {
      profileId: req.query['profileId']?.toString(),
      timeRange: req.query['timeRange']?.toString(),
      objectType: req.query['objectType']?.toString(),
    };

    try {
      const result = await v1.getContributionsStats(options);
      res.status(result.status || 200).send(result.data);
    } catch (err: any) {
      next(err);
    }
  },
);

/**
 * Retrieve statistics of web accesses to objects in the eDoc,
 * filtered by the profile.
 */
v1Router.get(
  '/api/statistics/web-access',
  async (req: Request, res: Response, next: Function) => {
    const options = {
      profileId: req.query['profileId']?.toString(),
    };

    try {
      const result = await v1.getWebAccessesStats(options);
      res.status(result.status || 200).send(result.data);
    } catch (err) {
      next(err);
    }
  },
);
