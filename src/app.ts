import express, { type Express } from 'express';
import helmet from 'helmet';
import { HTTP_STATUS, MAX_JSON_BODY_SIZE } from './constants';
import { errorHandler, notFoundHandler } from './middleware';
import { chatRouter } from './routes/chat';
import { userRouter } from './routes/user';

export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(express.json({ limit: MAX_JSON_BODY_SIZE }));

  app.get('/health', (_req, res): void => {
    res.status(HTTP_STATUS.OK).json({ success: true });
  });

  app.use('/chat', chatRouter);
  app.use('/user', userRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
