import {profile} from 'console';
import {
  validateEDocProfile,
  validateProfileId,
  validateEDocProfilePatch,
  validateeDocProfileDelete,
  validateEDocProfileListQuery,
  validateUserRegistration,
} from './validation';

describe('eDocProfile Validation', () => {
  describe('validateEDocProfile', () => {
    it('should validate a correct profile', () => {
      const data = {
        profileId: 'TEST123',
        isil: 'AT-TEST',
        contactEmails: ['test@example.com'],
        isActive: true,
        fullTextDeposit: true,
        profileAllowedTypes: ['type1', 'type2'],
      };
      const result = validateEDocProfile(data);
      expect(result.error).toBeUndefined();
    });

    it('should report error for missing required fields', () => {
      const data = {
        isil: 'AT-TEST',
      };
      const result: any = validateEDocProfile(data);
      expect(result.error).toBeDefined();
      expect(result.error.details[0].message).toContain(
        '"profileId" is required',
      );
    });

    it('should report error for invalid email format', () => {
      const data = {
        profileId: 'TEST123',
        isil: 'AT-TEST',
        contactEmails: ['invalid-email'],
        isActive: true,
        fullTextDeposit: true,
      };
      const result: any = validateEDocProfile(data);
      expect(result.error).toBeDefined();
      expect(result.error.details[0].message).toContain(
        'must be a valid email',
      );
    });
  });

  describe('validateProfileId', () => {
    it('should validate correctly with a valid profile ID', () => {
      const data = {profileId: 'TEST123'};
      const result = validateProfileId.validate(data);
      expect(result.error).toBeUndefined();
    });

    it('should report error when profile ID is missing', () => {
      const data = {};
      const result: any = validateProfileId.validate(data);
      expect(result.error).toBeDefined();
      expect(result.error.details[0].message).toContain('is required');
    });
  });

  describe('eDocProfile Patch Validation', () => {
    test('should validate correct data', () => {
      const data = {
        isActive: true,
        projectCode: 'OBV-EDOC',
      };
      const result = validateEDocProfilePatch(data);
      expect(result.error).toBeUndefined();
      expect(result.value).toEqual(data);
    });

    test('should report error on invalid data', () => {
      const data = {
        isActive: 'yes', // Incorrect type, should be boolean
      };
      const result = validateEDocProfilePatch(data);
      expect(result.error).toBeDefined();
      expect(result.error?.details[0].message).toMatch(/must be a boolean/);
    });

    test('should reject unexpected fields', () => {
      const data = {
        isActive: true,
        unknownField: 'some value',
      };
      const result = validateEDocProfilePatch(data);
      expect(result.error).toBeDefined();
      expect(result.error?.details[0].message).toMatch(/is not allowed/);
    });

    test('should accept partial data', () => {
      const data = {isActive: false};
      const result = validateEDocProfilePatch(data);
      expect(result.error).toBeUndefined();
      expect(result.value).toEqual(data);
    });

    test('should reject empty object (at least one field required)', () => {
      const data = {};
      const result = validateEDocProfilePatch(data);
      expect(result.error).toBeDefined();
    });
  });

  describe('validateeDocProfileDelete', () => {
    it('should validate correctly when profile ID and confirmation are provided', () => {
      const data = {profileId: 'TEST123', confirm: true};
      const result = validateeDocProfileDelete.validate(data);
      expect(result.error).toBeUndefined();
    });

    it('should report error when confirmation is missing', () => {
      const data = {profileId: 'TEST123'};
      const result: any = validateeDocProfileDelete.validate(data);
      expect(result.error).toBeDefined();
      expect(result.error.details[0].message).toContain('confirm" is required');
    });
  });
});

describe('validateEDocProfileListQuery', () => {
  it('should validate correctly with valid parameters', () => {
    const params = {isActive: 'true', projectCode: 'OBV-EDOC'};
    const result = validateEDocProfileListQuery(params);
    expect(result.error).toBeUndefined();
  });

  it('should report error for invalid parameters', () => {
    const params = {isActive: 'maybe'}; // invalid boolean value
    const result = validateEDocProfileListQuery(params);
    expect(result.error).not.toBeUndefined();
  });
});

describe('User Registration', () => {
  it('should validate user data correctly', () => {
    const user = {
      firstName: 'John',
      lastName: 'Doe',
      username: 'johndoe',
      userType: 'admin',
      email: 'Hk9pY@example.com',
      password: 'johndoe123',
      eDocProfiles: ['UBI-DIVERS', 'UBI-EDOC'],
      isActive: true,
    };
    const result = validateUserRegistration(user);
    expect(result.error).toBeUndefined();
  });

  it('should report error on invalid data', () => {
    const user = {
      firstName: 'John',
      lastName: 'Doe',
      username: 'johndoe',
      userType: 'admin',
      email: 'johndoe@mail',
      password: 'johndoe123',
      eDocProfiles: ['UBI-DIVERS', 'UBI-EDOC'],
      isActive: true,
    };
    const result = validateUserRegistration(user);
    expect(result.error).not.toBeUndefined();
  });
});
