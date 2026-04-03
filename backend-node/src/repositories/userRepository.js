class UserRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async ensureTable() {
    await this.pool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        picture TEXT NULL,
        provider VARCHAR(50) NOT NULL DEFAULT 'google',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_users_email (email)
      )
    `);
  }

  async findByEmail(email) {
    const [rows] = await this.pool.execute(
      'SELECT id, name, email, picture, provider FROM users WHERE email = ? LIMIT 1',
      [email]
    );
    return rows[0] || null;
  }

  async create({ name, email, picture, provider }) {
    const [result] = await this.pool.execute(
      'INSERT INTO users (name, email, picture, provider) VALUES (?, ?, ?, ?)',
      [name, email, picture, provider]
    );

    return {
      id: result.insertId,
      name,
      email,
      picture,
      provider,
    };
  }

  async updateProfile(id, { name, picture }) {
    await this.pool.execute(
      'UPDATE users SET name = ?, picture = ? WHERE id = ?',
      [name, picture, id]
    );

    const [rows] = await this.pool.execute(
      'SELECT id, name, email, picture, provider FROM users WHERE id = ? LIMIT 1',
      [id]
    );
    return rows[0] || null;
  }
}

module.exports = UserRepository;
