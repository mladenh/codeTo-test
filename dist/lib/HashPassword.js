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
exports.hashPassword = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const SALT_ROUNDS = 10;
/**
 * Hashes a plain text password.
 * @param {string} password - The plain text password to hash.
 * @returns {Promise<string>} - A promise that resolves to the hashed password.
 */
function hashPassword(password) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const salt = yield bcrypt_1.default.genSalt(SALT_ROUNDS);
            const hashedPassword = yield bcrypt_1.default.hash(password, salt);
            return hashedPassword;
        }
        catch (err) {
            // Log and/or handle the error appropriately
            console.error('Error hashing password:', err);
            throw new Error('Failed to hash password');
        }
    });
}
exports.hashPassword = hashPassword;
//# sourceMappingURL=HashPassword.js.map