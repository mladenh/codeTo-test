"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decomposeObjectID = void 0;
/**
 *
 */
function decomposeObjectID(acRecordObjectId) {
    const parts = acRecordObjectId.split('-');
    if (parts.length !== 2) {
        throw new Error('Invalid acRecordObjectId format');
    }
    const [type, sequence] = parts;
    const isNumericType = /^\d+$/.test(type); // Checks if 'type' is fully numeric
    return {
        type,
        sequence,
        isNumericType,
    };
}
exports.decomposeObjectID = decomposeObjectID;
//# sourceMappingURL=idUtils.js.map