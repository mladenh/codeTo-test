import {access, constants} from 'fs';
import multer from 'multer';
import path from 'path';

// Set up the destination and filename logic
const storage = multer.diskStorage({
  /**
   *
   */
  destination: function (
    req: Express.Request,
    file: Express.Multer.File,
    cb: (error: Error | null, destination: string) => void,
  ): void {
    const dataPath = path.join(__dirname, '../../dist/public/data');
    // Adjust the path
    access(dataPath, constants.W_OK, (err) => {
      if (err) cb(err, dataPath);
      else cb(null, dataPath);
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
    const filename = `${acnr}-${acRecordObjectId}${path.extname(file.originalname)}`;

    cb(null, filename);
  },
});

export const upload = multer({storage: storage});
