export const packageVersion = require('../../package.json').version;
export const packageName = require('../../package.json').name;

/**
 * @return {string} json - XML mit default OBVSG version
 */
export function getVersionBody() {
  const versionJson = {
    service: packageName,
    version: packageVersion,
  };

  return versionJson;
}
