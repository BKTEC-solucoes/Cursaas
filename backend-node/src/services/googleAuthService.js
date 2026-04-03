const AppError = require('../utils/appError');

class GoogleAuthService {
  constructor({ oauthClient, googleClientId, userRepository, tokenService }) {
    this.oauthClient = oauthClient;
    this.googleClientId = googleClientId;
    this.userRepository = userRepository;
    this.tokenService = tokenService;
  }

  async authenticateWithGoogle(idToken) {
    if (!idToken || typeof idToken !== 'string') {
      throw new AppError('Campo "token" é obrigatório', 400);
    }

    const payload = await this.verifyGoogleToken(idToken);
    const email = payload.email?.trim().toLowerCase();

    if (!email) {
      throw new AppError('Token do Google sem email', 400);
    }

    if (!payload.email_verified) {
      throw new AppError('Email do Google não verificado', 401);
    }

    const name = payload.name?.trim() || email.split('@')[0];
    const picture = payload.picture || null;

    let user = await this.userRepository.findByEmail(email);

    if (!user) {
      user = await this.userRepository.create({
        name,
        email,
        picture,
        provider: 'google',
      });
    } else if (user.name !== name || user.picture !== picture) {
      user = await this.userRepository.updateProfile(user.id, { name, picture });
    }

    const appToken = this.tokenService.generateForUser(user);

    return {
      token: appToken,
      user: {
        email: user.email,
        name: user.name,
      },
    };
  }

  async verifyGoogleToken(idToken) {
    try {
      const ticket = await this.oauthClient.verifyIdToken({
        idToken,
        audience: this.googleClientId,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new AppError('Token do Google inválido', 401);
      }

      return payload;
    } catch (_error) {
      throw new AppError('Token do Google inválido ou expirado', 401);
    }
  }
}

module.exports = GoogleAuthService;
