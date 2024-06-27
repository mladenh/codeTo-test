"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVersionBody = exports.packageName = exports.packageVersion = void 0;
exports.packageVersion = require('../../package.json').version;
exports.packageName = require('../../package.json').name;
/**
 * @return {string} json - XML mit default OBVSG version
 */
function getVersionBody() {
    const versionJson = {
        service: exports.packageName,
        version: exports.packageVersion,
    };
    return versionJson;
}
exports.getVersionBody = getVersionBody;
//# sourceMappingURL=version.js.map