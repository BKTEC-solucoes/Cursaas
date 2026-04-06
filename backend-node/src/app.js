const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const createAuthRoutes = require('./routes/auth');
const errorHandler = require('./middlewares/errorHandler');
const AppError = require('./utils/appError');

const createApp = ({ authController, corsOrigins }) => {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: corsOrigins,
      credentials: true,
    })
  );
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use('/auth', createAuthRoutes({ authController }));

  app.use((_req, _res, next) => {
    next(new AppError('Rota não encontrada', 404));
  });

  app.use(errorHandler);

  return app;
};

module.exports = createApp;
