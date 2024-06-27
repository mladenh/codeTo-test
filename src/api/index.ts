import bodyParser from 'body-parser';
import {logger} from '../lib/logger';
import express, {Request, Response, NextFunction} from 'express';
import {v1Router} from './routes/v1-route';
import {ServerError, TransientError, PermanentError} from '../lib/error';

export const app = express();

// app.use(favicon(path.join(__dirname, '/../../images', 'favicon.ico')));
app.use(bodyParser.json());
app.use(bodyParser.text());
//app.use(bodyParser.xml()); // TODO: bessere Lösung für xml parsing finden
app.use(bodyParser.urlencoded({extended: false}));

/*
 * Routes
 */
app.use('/v1', v1Router);

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (
    err instanceof SyntaxError &&
    (err as any).status === 400 &&
    'body' in err
  ) {
    logger.error(`Bad JSON syntax in request to ${req.url}`);
    return res.status(400).json({error: 'Invalid JSON syntax.'});
  }
  next(err);
});

// catch 404
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.error(`Error 404 on ${req.url}.`);
  res.status(404).json({status: 404, error: 'Not found'});
});

// catch errors
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error(
    `Error ${err.status || 500} (${err.message}) on ${req.method} ${req.url} with payload ${JSON.stringify(req.body)}.`,
  );

  if (err instanceof TransientError) {
    // Handle transient errors (typically 5xx)
    res.status(err.status || 500).json({error: err.message, code: err.code});
  } else if (err instanceof PermanentError) {
    // Handle permanent errors (typically 4xx)
    res.status(err.status || 400).json({error: err.message, code: err.code});
  } else if (err instanceof ServerError) {
    // Handle generic server errors
    res.status(err.status || 500).json({error: err.message, code: err.code});
  } else {
    // Handle other types of errors not specifically categorized
    res
      .status(500)
      .json({error: 'Internal Server Error', code: 'UNEXPECTED_ERROR'});
  }
});
