const parseNumber = (value, fallback) => {
  const numberValue = Number(value);
  return Number.isNaN(numberValue) ? fallback : numberValue;
};

const isUnsetOrPlaceholder = (value, placeholderToken) =>
  !value || (placeholderToken ? value.includes(placeholderToken) : false);

const env = {
  port: parseNumber(process.env.PORT, 3000),
  nodeEnv: process.env.NODE_ENV || 'development',
  dbHost: process.env.DB_HOST || 'localhost',
  dbPort: parseNumber(process.env.DB_PORT, 3306),
  dbUser: process.env.DB_USER || 'root',
  dbPassword: process.env.DB_PASSWORD || '',
  dbName: process.env.DB_NAME || 'cursaas',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:4200')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
};

const validateRequiredEnv = () => {
  const missing = [];

  if (isUnsetOrPlaceholder(process.env.GOOGLE_CLIENT_ID, 'SEU_GOOGLE_CLIENT_ID')) {
    missing.push('GOOGLE_CLIENT_ID');
  }

  if (isUnsetOrPlaceholder(process.env.JWT_SECRET, 'troque_por_uma_chave_forte')) {
    missing.push('JWT_SECRET');
  }

  if (missing.length > 0) {
    throw new Error(
      `Variaveis de ambiente obrigatorias ausentes/invalidas: ${missing.join(', ')}`
    );
  }
};

module.exports = {
  env,
  validateRequiredEnv,
};
