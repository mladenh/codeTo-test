"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapRequestDataToDbFields = void 0;
//  mapping from API field names to database column names
const fieldMappings = {
    profileId: 'unique_profile_id',
    isil: 'isil',
    projectCode: 'project_code',
    fullTextDeposit: 'full_text_deposit',
    '865mCode': 'subfield_m_code',
    contactEmails: 'contact_emails',
    profileAllowedTypes: 'profile_allowed_types',
    isActive: 'is_active',
    firstName: 'first_name',
    lastName: 'last_name',
    username: 'username',
    userType: 'user_type',
    email: 'email',
    password: 'password',
    eDocProfiles: 'eDocProfiles',
    //eDocProfiles: 'p.unique_profile_id', in the query to list users
    acnr: 'ac_number',
    profile: 'profile',
    objectType: 'object_type_name',
    sequence: 'sequence_number',
    belongsToAggregate: 'belongs_to_aggregate',
    label: 'label',
    fileUrl: 'file_url',
};
// Convert camelCase to custom - mappings for the db fields
/**
 *
 */
function mapRequestDataToDbFields(reqBodyQuery) {
    const dbData = {};
    Object.keys(reqBodyQuery).forEach((key) => {
        if (fieldMappings[key]) {
            dbData[fieldMappings[key]] = reqBodyQuery[key];
        }
    });
    return dbData;
}
exports.mapRequestDataToDbFields = mapRequestDataToDbFields;
//# sourceMappingURL=fieldMappings.js.map