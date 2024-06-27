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
exports.logAuditTrail = void 0;
// lib/auditTrail.js
const database_1 = __importDefault(require("./database"));
/**
 * Logs an action to the AuditTrail table.
 *
 * @param {Object} auditDetails
 */
function logAuditTrail(auditDetails) {
    return __awaiter(this, void 0, void 0, function* () {
        const { profile_id, user_id, action, object_id } = auditDetails;
        const timestamp = new Date();
        try {
            const conn = yield database_1.default.getConnection();
            const query = 'INSERT INTO AuditTrail (profile_id, user_id, action, object_id, timestamp) VALUES (?, ?, ?, ?, ?)';
            const result = yield conn.query(query, [
                profile_id,
                user_id,
                action,
                object_id,
                timestamp,
            ]);
            console.log('Audit trail logged:', result);
            conn.release();
        }
        catch (err) {
            console.error('Error logging audit trail:', err);
            // Handle error here
        }
    });
}
exports.logAuditTrail = logAuditTrail;
//# sourceMappingURL=auditTrail.js.map