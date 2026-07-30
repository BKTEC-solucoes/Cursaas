/**
 * Acesso à tabela `usuarios` — a MESMA usada pelo FastAPI.
 *
 * Este repositório é somente-leitura por decisão de segurança: o login Google
 * autentica quem já foi provisionado pelo fluxo oficial (convite, aprovação de
 * solicitação de cadastro ou criação por uma instituição). Ele nunca cria conta,
 * nunca atribui papel e nunca vincula tenant — caso contrário qualquer conta
 * Google viraria um usuário do sistema.
 */
class UserRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async findByEmail(email) {
    const [rows] = await this.pool.execute(
      `SELECT id, nome, email, role, admin_role, faculdade_id, ativo
         FROM usuarios
        WHERE LOWER(email) = ?
        LIMIT 1`,
      [email]
    );
    return rows[0] || null;
  }
}

module.exports = UserRepository;
