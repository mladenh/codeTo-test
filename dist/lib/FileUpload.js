"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = void 0;
const fs_1 = require("fs");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
// Set up the destination and filename logic
const storage = multer_1.default.diskStorage({
    /**
     *
     */
    destination: function (req, file, cb) {
        const dataPath = path_1.default.join(__dirname, '../../dist/public/data');
        // Adjust the path
        (0, fs_1.access)(dataPath, fs_1.constants.W_OK, (err) => {
            if (err)
                cb(err, dataPath);
            else
                cb(null, dataPath);
        });
    },
    /**
     *
     */
    filename: function (req, file, cb) {
        // Extract the acnr and acRecordObjectId from the request parameters
        const acnr = req.params.acnr;
        const acRecordObjectId = req.params.acRecordObjectId.replace(/-/g, ''); // Remove dashes
        // Set the filename to the acnr and acRecordObjectId with the file extension
        const filename = `${acnr}-${acRecordObjectId}${path_1.default.extname(file.originalname)}`;
        cb(null, filename);
    },
});
exports.upload = (0, multer_1.default)({ storage: storage });
//# sourceMappingURL=FileUpload.js.map