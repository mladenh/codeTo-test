// Importing necessary modules and mocks
import {createEDocProfile, listEDocProfiles} from './v1';
import {getEDocProfile} from './v1';
import {updateEDocProfile} from './v1';
import {deleteEDocProfile} from './v1';
import pool from '../../lib/database';
import {PermanentError, RequestError, TransientError} from '../../lib/error';

// Mocking the database module
jest.mock('../../lib/database', () => ({
  getConnection: jest.fn().mockReturnThis(),
  query: jest.fn(() => Promise.resolve()),
  release: jest.fn(),
}));

// Mocking the logger
jest.mock('../../lib/logger', () => ({
  error: jest.fn(),
}));

describe('EDoc Profile Management', () => {
  const mockedQuery = pool.query as jest.Mock;

  beforeEach(() => {
    mockedQuery.mockClear();
  });

  describe('createEDocProfile Functionality', () => {
    it('should successfully create a profile', async () => {
      const mockProfileData = {
        unique_profile_id: 'TEST2',
        isil: 'AT-TEST',
        project_code: 'OBV-EDOC',
        full_text_deposit: true,
        subfield_m_code: 'AT-OBV',
        contact_emails: ['test4@mail.at'],
        is_active: true,
      };
      const options = {body: mockProfileData};

      mockedQuery.mockResolvedValueOnce({affectedRows: 1, insertId: 123});

      const result = await createEDocProfile(options);

      expect(result.status).toBe(201);
      expect(result.data).toEqual(mockProfileData);
      expect(mockedQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
      );
    });

    it('should handle database errors during profile creation', async () => {
      const options = {body: {unique_profile_id: 'TEST3'}};
      const errorMessage = 'Database error occurred';
      mockedQuery.mockRejectedValueOnce(new Error(errorMessage));

      await expect(createEDocProfile(options)).rejects.toThrow(errorMessage);
    });
  });
});

describe('getEDocProfile Functionality', () => {
  const mockedQuery = pool.query as jest.Mock;

  beforeEach(() => {
    mockedQuery.mockClear();
  });
  it('should retrieve a profile successfully', async () => {
    const options = {profileId: 'TEST2'};
    mockedQuery.mockResolvedValueOnce([
      {unique_profile_id: 'TEST2', isil: 'AT-TEST'},
    ]);

    const result = await getEDocProfile(options);
    expect(result.status).toBe(200);
    expect(result.data).toHaveProperty('unique_profile_id', 'TEST2');
  });

  it('should throw an error for a missing profile ID', async () => {
    const options = {profileId: undefined};
    await expect(getEDocProfile(options)).rejects.toThrow(RequestError);
  });
  it('should throw a PermanentError for not found', async () => {
    const options = {profileId: 'TEST3'};
    mockedQuery.mockResolvedValueOnce([]); // Simulate not finding the profile

    await expect(getEDocProfile(options)).rejects.toThrow(PermanentError);
  });

  it('should handle database errors', async () => {
    const options = {profileId: 'TEST2'};
    const errorMessage = 'Database error occurred';
    mockedQuery.mockRejectedValueOnce(new Error(errorMessage));

    await expect(getEDocProfile(options)).rejects.toThrow(TransientError);
  });
});

describe('updateEDocProfile Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('successfully updates a profile', async () => {
    const mockedQuery = pool.query as jest.Mock;
    mockedQuery.mockResolvedValueOnce({affectedRows: 1});

    const options = {
      profileId: 'TEST123',
      body: {projectCode: 'OBV-EDOC'},
    };

    const result = await updateEDocProfile(options);

    expect(result).toEqual({
      status: 200,
      data: {message: 'Profile updated successfully.'},
    });
    expect(mockedQuery).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining([options.body.projectCode, options.profileId]),
    );
  });

  it('throws an error if the profile ID is missing', async () => {
    const options = {
      profileId: '',
      body: {projectCode: 'OBV-EDOC'},
    };

    await expect(updateEDocProfile(options)).rejects.toThrow(
      'Missing profile ID or update data.',
    );
  });

  it('handles database errors during update', async () => {
    const mockedQuery = pool.query as jest.Mock;
    mockedQuery.mockRejectedValue(new Error('Database failure'));

    const options = {
      profileId: 'TEST123',
      body: {projectCode: 'OBV-EDOC'},
    };

    await expect(updateEDocProfile(options)).rejects.toThrow(
      'Database error during profile update.',
    );
  });
});

describe('deleteEDocProfile', () => {
  it('should delete a profile successfully', async () => {
    const mockedQuery = pool.query as jest.Mock;
    mockedQuery.mockResolvedValueOnce({affectedRows: 1});
    const result = await deleteEDocProfile({profileId: 'TEST2', confirm: true});
    expect(result).toEqual({
      status: 204,
      data: {message: 'Profile deleted successfully.'},
    });
  });

  it('should throw an error if the profile does not exist', async () => {
    const mockedQuery = pool.query as jest.Mock;
    mockedQuery.mockResolvedValueOnce({affectedRows: 0});
    await expect(
      deleteEDocProfile({profileId: 'TEST2', confirm: true}),
    ).rejects.toThrow(
      new PermanentError('The profile to delete does not exist.', 'NOT_FOUND'),
    );
  });

  it('should require confirmation', async () => {
    await expect(
      deleteEDocProfile({profileId: 'TEST2', confirm: false}),
    ).rejects.toThrow(
      new PermanentError('Deletion must be confirmed', 'CONFIRMATION_REQUIRED'),
    );
  });

  it('should handle database errors', async () => {
    const mockedQuery = pool.query as jest.Mock;
    mockedQuery.mockRejectedValue(new Error('Database error'));
    await expect(
      deleteEDocProfile({profileId: 'TEST2', confirm: true}),
    ).rejects.toThrow('Failed to delete the profile due to server error.');
  });
});

describe('listEDocProfiles', () => {
  const mockedQuery = pool.query as jest.Mock;
  it('should return profiles when called with valid filters', async () => {
    // Setup your mocks to return expected data
    const mockProfiles = [{profile_id: 1, is_active: true}];
    mockedQuery.mockResolvedValue({
      query: jest.fn().mockResolvedValue(mockProfiles),
      release: jest.fn(),
    });
    const response = await listEDocProfiles({query: {isActive: true}});
    expect(response.data).toEqual(mockProfiles);
    expect(response.status).toBe(200);
  });
  it('should throw an error when no profiles are found', async () => {
    mockedQuery.mockResolvedValue({
      query: jest.fn().mockResolvedValue([]),
      release: jest.fn(),
    });
    await expect(listEDocProfiles({query: {isActive: true}})).rejects.toThrow(
      TransientError,
    );
  });

  // Add more tests for different scenarios
});

test('test v1 of registerUser part', async () => {
  // const options = {body: ''};
  try {
    // TODO: eigene Implementierung der Tests hier!
    // const v1 = require('./v1.js');
    // const result = await v1.processRequest(options);
    // expect(result.status).toBeDefined();
    // expect(result.data).toBeDefined();
    expect(1).toBe(1);
  } catch (err: any) {
    expect(0).toBe(1);
  }
});
test.todo('Spezifischere Tests implementieren');

test('test v1 of loginUser part', async () => {
  // const options = {body: ''};
  try {
    // TODO: eigene Implementierung der Tests hier!
    // const v1 = require('./v1.js');
    // const result = await v1.processRequest(options);
    // expect(result.status).toBeDefined();
    // expect(result.data).toBeDefined();
    expect(1).toBe(1);
  } catch (err: any) {
    expect(0).toBe(1);
  }
});
test.todo('Spezifischere Tests implementieren');

test('test v1 of updateUser part', async () => {
  // const options = {body: ''};
  try {
    // TODO: eigene Implementierung der Tests hier!
    // const v1 = require('./v1.js');
    // const result = await v1.processRequest(options);
    // expect(result.status).toBeDefined();
    // expect(result.data).toBeDefined();
    expect(1).toBe(1);
  } catch (err: any) {
    expect(0).toBe(1);
  }
});
test.todo('Spezifischere Tests implementieren');

test('test v1 of deleteUser part', async () => {
  // const options = {body: ''};
  try {
    // TODO: eigene Implementierung der Tests hier!
    // const v1 = require('./v1.js');
    // const result = await v1.processRequest(options);
    // expect(result.status).toBeDefined();
    // expect(result.data).toBeDefined();
    expect(1).toBe(1);
  } catch (err: any) {
    expect(0).toBe(1);
  }
});
test.todo('Spezifischere Tests implementieren');

test('test v1 of getUser part', async () => {
  // const options = {body: ''};
  try {
    // TODO: eigene Implementierung der Tests hier!
    // const v1 = require('./v1.js');
    // const result = await v1.processRequest(options);
    // expect(result.status).toBeDefined();
    // expect(result.data).toBeDefined();
    expect(1).toBe(1);
  } catch (err: any) {
    expect(0).toBe(1);
  }
});
test.todo('Spezifischere Tests implementieren');

test('test v1 of listUsers part', async () => {
  // const options = {body: ''};
  try {
    // TODO: eigene Implementierung der Tests hier!
    // const v1 = require('./v1.js');
    // const result = await v1.processRequest(options);
    // expect(result.status).toBeDefined();
    // expect(result.data).toBeDefined();
    expect(1).toBe(1);
  } catch (err: any) {
    expect(0).toBe(1);
  }
});
test.todo('Spezifischere Tests implementieren');

test('test v1 of createObject part', async () => {
  // const options = {body: ''};
  try {
    // TODO: eigene Implementierung der Tests hier!
    // const v1 = require('./v1.js');
    // const result = await v1.processRequest(options);
    // expect(result.status).toBeDefined();
    // expect(result.data).toBeDefined();
    expect(1).toBe(1);
  } catch (err: any) {
    expect(0).toBe(1);
  }
});
test.todo('Spezifischere Tests implementieren');

test('test v1 of searchObjects part', async () => {
  // const options = {body: ''};
  try {
    // TODO: eigene Implementierung der Tests hier!
    // const v1 = require('./v1.js');
    // const result = await v1.processRequest(options);
    // expect(result.status).toBeDefined();
    // expect(result.data).toBeDefined();
    expect(1).toBe(1);
  } catch (err: any) {
    expect(0).toBe(1);
  }
});
test.todo('Spezifischere Tests implementieren');

test('test v1 of deleteObjects part', async () => {
  // const options = {body: ''};
  try {
    // TODO: eigene Implementierung der Tests hier!
    // const v1 = require('./v1.js');
    // const result = await v1.processRequest(options);
    // expect(result.status).toBeDefined();
    // expect(result.data).toBeDefined();
    expect(1).toBe(1);
  } catch (err: any) {
    expect(0).toBe(1);
  }
});
test.todo('Spezifischere Tests implementieren');

test('test v1 of getObject part', async () => {
  // const options = {body: ''};
  try {
    // TODO: eigene Implementierung der Tests hier!
    // const v1 = require('./v1.js');
    // const result = await v1.processRequest(options);
    // expect(result.status).toBeDefined();
    // expect(result.data).toBeDefined();
    expect(1).toBe(1);
  } catch (err: any) {
    expect(0).toBe(1);
  }
});
test.todo('Spezifischere Tests implementieren');

test('test v1 of updateObject part', async () => {
  // const options = {body: ''};
  try {
    // TODO: eigene Implementierung der Tests hier!
    // const v1 = require('./v1.js');
    // const result = await v1.processRequest(options);
    // expect(result.status).toBeDefined();
    // expect(result.data).toBeDefined();
    expect(1).toBe(1);
  } catch (err: any) {
    expect(0).toBe(1);
  }
});
test.todo('Spezifischere Tests implementieren');

test('test v1 of deleteObject part', async () => {
  // const options = {body: ''};
  try {
    // TODO: eigene Implementierung der Tests hier!
    // const v1 = require('./v1.js');
    // const result = await v1.processRequest(options);
    // expect(result.status).toBeDefined();
    // expect(result.data).toBeDefined();
    expect(1).toBe(1);
  } catch (err: any) {
    expect(0).toBe(1);
  }
});
test.todo('Spezifischere Tests implementieren');

test('test v1 of directDelivery part', async () => {
  // const options = {body: ''};
  try {
    // TODO: eigene Implementierung der Tests hier!
    // const v1 = require('./v1.js');
    // const result = await v1.processRequest(options);
    // expect(result.status).toBeDefined();
    // expect(result.data).toBeDefined();
    expect(1).toBe(1);
  } catch (err: any) {
    expect(0).toBe(1);
  }
});
test.todo('Spezifischere Tests implementieren');

test('test v1 of createFullTextCache part', async () => {
  // const options = {body: ''};
  try {
    // TODO: eigene Implementierung der Tests hier!
    // const v1 = require('./v1.js');
    // const result = await v1.processRequest(options);
    // expect(result.status).toBeDefined();
    // expect(result.data).toBeDefined();
    expect(1).toBe(1);
  } catch (err: any) {
    expect(0).toBe(1);
  }
});
test.todo('Spezifischere Tests implementieren');

test('test v1 of getFullTextCache part', async () => {
  // const options = {body: ''};
  try {
    // TODO: eigene Implementierung der Tests hier!
    // const v1 = require('./v1.js');
    // const result = await v1.processRequest(options);
    // expect(result.status).toBeDefined();
    // expect(result.data).toBeDefined();
    expect(1).toBe(1);
  } catch (err: any) {
    expect(0).toBe(1);
  }
});
test.todo('Spezifischere Tests implementieren');

test('test v1 of rebuildFullTextCache part', async () => {
  // const options = {body: ''};
  try {
    // TODO: eigene Implementierung der Tests hier!
    // const v1 = require('./v1.js');
    // const result = await v1.processRequest(options);
    // expect(result.status).toBeDefined();
    // expect(result.data).toBeDefined();
    expect(1).toBe(1);
  } catch (err: any) {
    expect(0).toBe(1);
  }
});
test.todo('Spezifischere Tests implementieren');

test('test v1 of extendPnxWithFullText part', async () => {
  // const options = {body: ''};
  try {
    // TODO: eigene Implementierung der Tests hier!
    // const v1 = require('./v1.js');
    // const result = await v1.processRequest(options);
    // expect(result.status).toBeDefined();
    // expect(result.data).toBeDefined();
    expect(1).toBe(1);
  } catch (err: any) {
    expect(0).toBe(1);
  }
});
test.todo('Spezifischere Tests implementieren');

test('test v1 of generateUserReport part', async () => {
  // const options = {body: ''};
  try {
    // TODO: eigene Implementierung der Tests hier!
    // const v1 = require('./v1.js');
    // const result = await v1.processRequest(options);
    // expect(result.status).toBeDefined();
    // expect(result.data).toBeDefined();
    expect(1).toBe(1);
  } catch (err: any) {
    expect(0).toBe(1);
  }
});
test.todo('Spezifischere Tests implementieren');

test('test v1 of getContributionsStats part', async () => {
  // const options = {body: ''};
  try {
    // TODO: eigene Implementierung der Tests hier!
    // const v1 = require('./v1.js');
    // const result = await v1.processRequest(options);
    // expect(result.status).toBeDefined();
    // expect(result.data).toBeDefined();
    expect(1).toBe(1);
  } catch (err: any) {
    expect(0).toBe(1);
  }
});
test.todo('Spezifischere Tests implementieren');

test('test v1 of getWebAccessesStats part', async () => {
  // const options = {body: ''};
  try {
    // TODO: eigene Implementierung der Tests hier!
    // const v1 = require('./v1.js');
    // const result = await v1.processRequest(options);
    // expect(result.status).toBeDefined();
    // expect(result.data).toBeDefined();
    expect(1).toBe(1);
  } catch (err: any) {
    expect(0).toBe(1);
  }
});
