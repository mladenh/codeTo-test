"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const body_parser_1 = __importDefault(require("body-parser"));
const logger_1 = require("../lib/logger");
const express_1 = __importDefault(require("express"));
const v1_route_1 = require("./routes/v1-route");
const error_1 = require("../lib/error");
exports.app = (0, express_1.default)();
// app.use(favicon(path.join(__dirname, '/../../images', 'favicon.ico')));
exports.app.use(body_parser_1.default.json());
exports.app.use(body_parser_1.default.text());
//app.use(bodyParser.xml()); // TODO: bessere Lösung für xml parsing finden
exports.app.use(body_parser_1.default.urlencoded({ extended: false }));
/*
 * Routes
 */
exports.app.use('/v1', v1_route_1.v1Router);
exports.app.use((err, req, res, next) => {
    if (err instanceof SyntaxError &&
        err.status === 400 &&
        'body' in err) {
        logger_1.logger.error(`Bad JSON syntax in request to ${req.url}`);
        return res.status(400).json({ error: 'Invalid JSON syntax.' });
    }
    next(err);
});
// catch 404
exports.app.use((req, res, next) => {
    logger_1.logger.error(`Error 404 on ${req.url}.`);
    res.status(404).json({ status: 404, error: 'Not found' });
});
// catch errors
exports.app.use((err, req, res, next) => {
    logger_1.logger.error(`Error ${err.status || 500} (${err.message}) on ${req.method} ${req.url} with payload ${JSON.stringify(req.body)}.`);
    if (err instanceof error_1.TransientError) {
        // Handle transient errors (typically 5xx)
        res.status(err.status || 500).json({ error: err.message, code: err.code });
    }
    else if (err instanceof error_1.PermanentError) {
        // Handle permanent errors (typically 4xx)
        res.status(err.status || 400).json({ error: err.message, code: err.code });
    }
    else if (err instanceof error_1.ServerError) {
        // Handle generic server errors
        res.status(err.status || 500).json({ error: err.message, code: err.code });
    }
    else {
        // Handle other types of errors not specifically categorized
        res
            .status(500)
            .json({ error: 'Internal Server Error', code: 'UNEXPECTED_ERROR' });
    }
});
//# sourceMappingURL=index.js.map