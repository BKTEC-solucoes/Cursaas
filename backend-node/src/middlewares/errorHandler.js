const AppError = require('../utils/appError');

const errorHandler = (error, req, res, _next) => {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({ message: error.message });
  }

  console.error('Erro interno:', error);
  return res.status(500).json({ message: 'Erro interno do servidor' });
};

module.exports = errorHandler;
