const jwt = require('jsonwebtoken');

/**
 * Emite o JWT da aplicação.
 *
 * As claims precisam ser idênticas às de `AuthService.create_access_token`
 * (backend/app/services/auth_service.py) — o FastAPI e o TenantMiddleware leem
 * `sub`, `role`, `admin_role`, `user_id`, `nome` e `faculdade_id`. Todos os
 * valores vêm da linha em `usuarios`; nenhum papel é atribuído aqui.
 */
class TokenService {
  constructor({ jwtSecret, jwtExpiresIn }) {
    this.jwtSecret = jwtSecret;
    this.jwtExpiresIn = jwtExpiresIn;
  }

  generateForUser(user) {
    const payload = {
      sub: user.email,
      role: user.role,
      admin_role: user.admin_role ?? null,
      user_id: user.id,
      nome: user.nome,
      faculdade_id: user.faculdade_id ?? null,
    };

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn,
    });
  }
}

module.exports = TokenService;
