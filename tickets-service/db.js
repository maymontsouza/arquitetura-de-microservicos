import pg from "pg";

const { Pool } = pg;

const DATABASE_URL =
  process.env.DATABASE_URL || "postgres://postgres:postgres@tickets-db:5432/tickets";

export const pool = new Pool({
  connectionString: DATABASE_URL,
});

export async function query(sql, params = []) {
  const client = await pool.connect();
  try {
    const res = await client.query(sql, params);
    return res;
  } finally {
    client.release();
  }
}
