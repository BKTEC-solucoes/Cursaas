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

    const user = await this.userRepository.findByEmail(email);

    // O Google prova QUEM é o usuário, não que ele tem acesso. A conta precisa
    // existir em `usuarios`, provisionada pelo fluxo oficial. Auto-criar aqui
    // daria conta no sistema a qualquer pessoa com um e-mail Google.
    if (!user) {
      throw new AppError(
        'Nenhuma conta Cursaas vinculada a este e-mail. Solicite acesso à sua instituição.',
        403
      );
    }

    if (!user.ativo) {
      throw new AppError('Usuário desativado', 403);
    }

    const appToken = this.tokenService.generateForUser(user);

    return {
      token: appToken,
      user: {
        email: user.email,
        name: user.nome,
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
