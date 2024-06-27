import {ConfigSingleton} from './config';
const singletonConf = ConfigSingleton.getInstance();
const config = singletonConf.config;

test('Check default Config file Content', () => {
  expect(config).toBeDefined();
  expect(config.api.port).toBe(60021);
  expect(config.logger.level).toBe('debug');
  expect(Object.keys(config.logger.levels).length).toBe(6);
});
