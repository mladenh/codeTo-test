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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isACNr = exports.getAlmaConnection = exports.fetchBibFromAlma = void 0;
const RateLimitedRequest = require('@obvsg/rate-limited-request/lib/request');
const { AlmaApiConnection, Bib, Bibs } = require('@obvsg/alma-js');
/**
 *
 */
function isACNr(id) {
    return /^AC[0-9]{8}$/i.test(id);
}
exports.isACNr = isACNr;
/**
 *
 */
function getAlmaConnection(apikey = process.env.API_KEY) {
    const conn = new AlmaApiConnection({
        apikey: apikey,
    }, 200000);
    return conn;
}
exports.getAlmaConnection = getAlmaConnection;
/**
 *
 */
function fetchBibFromAlma(id_1) {
    return __awaiter(this, arguments, void 0, function* (id, conn = getAlmaConnection()) {
        var _a, e_1, _b, _c;
        try {
            if (isACNr(id)) {
                const bibObj = new Bibs({ apiConnection: conn });
                const bibs = yield bibObj.query({ other_system_id: id });
                try {
                    for (var _d = true, bibs_1 = __asyncValues(bibs), bibs_1_1; bibs_1_1 = yield bibs_1.next(), _a = bibs_1_1.done, !_a; _d = true) {
                        _c = bibs_1_1.value;
                        _d = false;
                        const bib = _c;
                        return yield bib.retrieve();
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (!_d && !_a && (_b = bibs_1.return)) yield _b.call(bibs_1);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
            }
            else {
                console.info('No valid id');
                return undefined;
            }
        }
        catch (err) {
            console.error('Error  ' + id, err);
            throw err; // Rethrow the error
        }
    });
}
exports.fetchBibFromAlma = fetchBibFromAlma;
//# sourceMappingURL=almaApiHelpers.js.map