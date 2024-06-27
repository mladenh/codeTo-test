import {
  ServerError,
  PermanentError,
  TransientError,
  RequestError,
} from './error';

describe('try all errors', () => {
  test('ServerError werfen', (done) => {
    try {
      throw new ServerError('blubb', 'ORG0815');
    } catch (err: any) {
      expect(err.message).toBe('blubb');
      expect(err.status).toBe(400);
      expect(err.code).toBe('ORG0815');
    }
    done();
  });

  test('PermanentError werfen', (done) => {
    try {
      throw new PermanentError('blubb', 'ORGER0815');
    } catch (err: any) {
      expect(err.message).toBe('blubb');
      expect(err.status).toBe(400);
      expect(err.code).toBe('ORGER0815');
    }
    done();
  });

  test('TransientError werfen', (done) => {
    try {
      throw new TransientError('blubb', 'ORG0815');
    } catch (err: any) {
      expect(err.message).toBe('blubb');
      expect(err.status).toBe(500);
      expect(err.code).toBe('ORG0815');
    }
    done();
  });

  test('RequestError werfen', (done) => {
    const errText = 'Mein Errortext';
    try {
      throw new RequestError(errText);
    } catch (err: any) {
      expect(err.message).toBe('invalid request to ' + errText);
      expect(err.status).toBe(400);
      expect(err.code).toBe('WEBHOOK001');
    }
    done();
  });
});
