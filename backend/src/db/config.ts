// backend/src/db/config.ts
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config(); // Ensure environment variables are loaded

// Validate essential environment variables
if (!process.env.DATABASE_URL) {
  console.error("FATAL ERROR: DATABASE_URL environment variable is not set.");
  // In a real app, you might throw an error or handle this more gracefully
  // For setup, exiting might be okay if DB is essential.
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Optional: Add SSL configuration if required for your database connection
  // ssl: {
  //   rejectUnauthorized: false // Use only if necessary (e.g., Heroku Hobby tier)
  // }
});

// Optional: Test the connection
pool.connect((err, client, release) => {
  if (err) {
    return console.error('Error acquiring client', err.stack);
  }
  client?.query('SELECT NOW()', (err, result) => {
    release(); // Release the client back to the pool
    if (err) {
      return console.error('Error executing query', err.stack);
    }
    console.log('🐘 Database connection successful:', result.rows[0].now);
  });
});

export default pool;