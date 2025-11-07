import pkg from "pg";
const { Pool } = pkg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function ping() {
  try {
    await pool.query("SELECT 1");
    return true;
  } catch (err) {
    console.error("[db ping error]", err);
    return false;
  }
}

