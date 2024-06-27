import * as version from './version';

test('Test version, MUSS funktionieren', () => {
  const packageVersion = require('../../package.json').version;
  expect(version.packageVersion).toBe(packageVersion);
});
