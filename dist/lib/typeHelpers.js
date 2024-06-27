"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTypeCode = void 0;
const database_1 = __importDefault(require("./database"));
const error_1 = require("./error");
/**
 * Fetches the type code from the database based on the type name.
 * @param {string} type The name of the type for which the code is needed.
 * @returns {Promise<number>} The type code.
 * @throws {PermanentError} If the type is not found.
 */
function getTypeCode(type) {
    return __awaiter(this, void 0, void 0, function* () {
        let conn;
        try {
            conn = yield database_1.default.getConnection();
            const result = yield conn.query('SELECT type_code FROM Edoc_Content_Types WHERE type_name = ?', [type]);
            if (result.length > 0) {
                return result[0].type_code;
            }
            else {
                throw new error_1.PermanentError(`Type ${type} not found`, 'TYPE_NOT_FOUND');
            }
        }
        finally {
            if (conn) {
                yield conn.release();
            }
        }
    });
}
exports.getTypeCode = getTypeCode;
//# sourceMappingURL=typeHelpers.js.map