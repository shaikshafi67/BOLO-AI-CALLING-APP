import { pool } from '../config/db';
import { CreateUserInput, User } from '../models/user.model';

function rowToUser(row: any): User {
  return {
    id: row.id,
    firebaseUid: row.firebase_uid,
    name: row.name,
    email: row.email,
    preferredLanguage: row.preferred_language,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
  };
}

export const userService = {
  async createProfile(input: CreateUserInput): Promise<User> {
    const result = await pool.query(
      `INSERT INTO users (firebase_uid, name, email, preferred_language)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [input.firebaseUid, input.name, input.email, input.preferredLanguage],
    );
    return rowToUser(result.rows[0]);
  },

  async getById(id: string): Promise<User | null> {
    // users.id is a UUID; anything else can't match (and would make Postgres throw).
    if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] ? rowToUser(result.rows[0]) : null;
  },

  async getByFirebaseUid(firebaseUid: string): Promise<User | null> {
    const result = await pool.query('SELECT * FROM users WHERE firebase_uid = $1', [firebaseUid]);
    return result.rows[0] ? rowToUser(result.rows[0]) : null;
  },

  async updatePreferredLanguage(firebaseUid: string, preferredLanguage: string): Promise<User | null> {
    const result = await pool.query(
      `UPDATE users SET preferred_language = $2 WHERE firebase_uid = $1 RETURNING *`,
      [firebaseUid, preferredLanguage],
    );
    return result.rows[0] ? rowToUser(result.rows[0]) : null;
  },

  async search(query: string, excludeFirebaseUid: string): Promise<User[]> {
    const result = await pool.query(
      `SELECT * FROM users
       WHERE name ILIKE $1 AND firebase_uid <> $2
       ORDER BY name
       LIMIT 20`,
      [`%${query}%`, excludeFirebaseUid],
    );
    return result.rows.map(rowToUser);
  },
};
