const jwt = require('jsonwebtoken');

class TokenService {
  constructor({ jwtSecret, jwtExpiresIn }) {
    this.jwtSecret = jwtSecret;
    this.jwtExpiresIn = jwtExpiresIn;
  }

  generateForUser(user) {
    const payload = {
      sub: user.email,
      email: user.email,
      user_id: user.id,
      nome: user.name,
      role: 'admin',
      admin_role: null,
      provider: user.provider,
    };

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn,
      issuer: 'cursaas-auth',
    });
  }
}

module.exports = TokenService;
