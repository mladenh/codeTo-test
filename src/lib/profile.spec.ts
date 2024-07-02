import {
  checkProfileExists,
  insertProfile,
  insertProfileAllowedTypes,
} from './profile';
import {DuplicateProfileError, PermanentError} from './error';
import mariadb from 'mariadb';

describe('checkProfileExists', () => {
  it('should throw DuplicateProfileError if profile exists', async () => {
    const conn = {} as mariadb.PoolConnection;
    const profileId = '123';
    const query = jest.fn().mockResolvedValue([{profile_id: '123'}]);
    conn.query = query;

    await expect(checkProfileExists(conn, profileId)).rejects.toThrow(
      DuplicateProfileError,
    );
    expect(query).toHaveBeenCalledWith(
      'SELECT profile_id FROM edoc2.Profile WHERE unique_profile_id = ?',
      [profileId],
    );
  });

  it('should not throw error if profile does not exist', async () => {
    const conn = {} as mariadb.PoolConnection;
    const profileId = '123';
    const query = jest.fn().mockResolvedValue([]);
    conn.query = query;

    await expect(checkProfileExists(conn, profileId)).resolves.toBeUndefined();
    expect(query).toHaveBeenCalledWith(
      'SELECT profile_id FROM edoc2.Profile WHERE unique_profile_id = ?',
      [profileId],
    );
  });
});

describe('insertProfile', () => {
  it('should insert a new profile and return the ID', async () => {
    const conn = {} as mariadb.PoolConnection;

    /**
     *
     */
    type AllowedType =
      | 'Volltext'
      | 'Inhaltsverzeichnis'
      | 'Klappentext'
      | 'Umschlagbild'
      | 'Bild';

    const profileData = {
      profileId: '123',
      isil: 'ABC',
      projectCode: 'XYZ',
      fullTextDeposit: true,
      '865mCode': 'M123',
      contactEmails: ['email1@example.com', 'email2@example.com'],
      profileAllowedTypes: ['Volltext', 'Bild'] as AllowedType[],
      isActive: true,
    };
    const insertQuery = jest.fn().mockResolvedValue({insertId: 1});
    conn.query = insertQuery;

    const result = await insertProfile(conn, profileData);
    expect(result).toBe(1);

    const sqlQuery =
      // eslint-disable-next-line max-len
      'INSERT INTO Profile (unique_profile_id, isil, project_code, full_text_deposit, subfield_m_code, contact_emails, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)'.trim();

    expect(insertQuery).toHaveBeenCalledWith(sqlQuery, [
      profileData.profileId,
      profileData.isil,
      profileData.projectCode,
      profileData.fullTextDeposit,
      profileData['865mCode'],
      JSON.stringify(profileData.contactEmails),
      profileData.isActive,
    ]);
  });
});

describe('insertProfileAllowedTypes', () => {
  it('should insert profile allowed types', async () => {
    //const conn = {query: jest.fn()} as any as mariadb.PoolConnection;
    const profileId = 123;
    const allowedTypes = ['Volltext', 'Inhaltsverzeichnis'];

    const queryMock = jest
      .fn()
      .mockResolvedValueOnce([{type_code: 'T1'}])
      .mockResolvedValueOnce([{type_code: 'T2'}]);

    const conn = {query: queryMock} as any as mariadb.PoolConnection;

    await insertProfileAllowedTypes(conn, profileId, allowedTypes);

    expect(queryMock).toHaveBeenNthCalledWith(
      1,
      'SELECT type_code FROM Edoc_Content_Types WHERE type_name = ?',
      ['Volltext'],
    );
    expect(queryMock).toHaveBeenNthCalledWith(
      2,
      'SELECT type_code FROM Edoc_Content_Types WHERE type_name = ?',
      ['Inhaltsverzeichnis'],
    );

    // Verify that the correct INSERT queries are made
    // eslint-disable-next-line max-len
    expect(queryMock).toHaveBeenNthCalledWith(
      3,
      'INSERT INTO Profile_Allowed_Types (profile_id, type_code) VALUES (?, ?)',
      [profileId, 'T1'],
    );
    // eslint-disable-next-line max-len
    expect(queryMock).toHaveBeenNthCalledWith(
      4,
      'INSERT INTO Profile_Allowed_Types (profile_id, type_code) VALUES (?, ?)',
      [profileId, 'T2'],
    );
  });

  it('should throw an error if a type is not found', async () => {
    const queryMock = jest.fn().mockResolvedValue([]);
    const conn = {query: queryMock} as any as mariadb.PoolConnection;
    const profileId = 123;
    const allowedTypes = ['UnknownType'];

    await expect(
      insertProfileAllowedTypes(conn, profileId, allowedTypes),
    ).rejects.toThrow(PermanentError);
  });
});
