import {logger} from './logger';

describe('winston basic logger', () => {
  test('most basic', () => {
    logger.info('Logging info from test');
    logger.debug('debug geht momentan ins Nirvana');
    logger.warn('I am WARNING you!');
    logger.error('error wird momentan gleich wie info behandelt');

    expect(42).toBe(42);
  });
});
