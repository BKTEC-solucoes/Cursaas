require('dotenv').config();

const { OAuth2Client } = require('google-auth-library');
const createApp = require('./app');
const { env, validateRequiredEnv } = require('./config/env');
const { pool, testDatabaseConnection } = require('./config/database');
const UserRepository = require('./repositories/userRepository');
const TokenService = require('./services/tokenService');
const GoogleAuthService = require('./services/googleAuthService');
const AuthController = require('./controllers/authController');

const startServer = async () => {
  validateRequiredEnv();
  await testDatabaseConnection();

  const userRepository = new UserRepository(pool);
  await userRepository.ensureTable();

  const oauthClient = new OAuth2Client(env.googleClientId);
  const tokenService = new TokenService({
    jwtSecret: env.jwtSecret,
    jwtExpiresIn: env.jwtExpiresIn,
  });

  const googleAuthService = new GoogleAuthService({
    oauthClient,
    googleClientId: env.googleClientId,
    userRepository,
    tokenService,
  });

  const authController = new AuthController({ googleAuthService });
  const app = createApp({ authController, corsOrigins: env.corsOrigins });

  app.listen(env.port, () => {
    console.log(`Servidor Google Auth rodando em http://localhost:${env.port}`);
  });
};

startServer().catch((error) => {
  console.error('Falha ao iniciar backend de autenticação Google:', error);
  process.exit(1);
});
