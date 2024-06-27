import * as config from 'config';

/**
 * Config Object
 */
export interface ConfObj extends config.IConfig {
  api: {
    port: number;
  };
}

/**
 *
 */
export interface Options {
  acnr?: string;
  profileId?: string;
  sequence?: string;
  objectType?: string;
  modifier?: string;
  userIdQuery?: number;
  confirm?: boolean;
  timeRange?: string;
  activityType?: string;
  fileExtension?: string;
  isil?: string;
  profile?: string;
  username?: string;
  acRecordObjectId?: string;
  file?: Express.Multer.File;
  query?: {
    acnr?: string;
    isil?: string;
    profile?: string;
    sequence?: string;
    objectType?: string;
    fileExtension?: string;
    belongsToAggregate?: boolean;
    label?: string;
    dateRange?: string;
    fileName?: string;
    sortBy?: 'acnr' | 'objectType' | 'profile' | 'isil';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    page?: number;
    firstName?: string;
    lastName?: string;
    userType?: string;
    email?: string;
    eDocProfiles?: string[];
    isActive?: boolean;
  };
  body?: any; //added
  belongsToAggregate?: boolean;
  label?: string;
  fileUrl?: string;
  object_type?: string; //added
}

/**
 *
 */
export interface ResultObject {
  status: string;
  data: string;
}
