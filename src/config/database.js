const { Pool } = require('pg');

let pool;

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for database operations.');
  }

  try {
    const parsedUrl = new URL(databaseUrl);

    if (!['postgres:', 'postgresql:'].includes(parsedUrl.protocol)) {
      throw new Error('unsupported protocol');
    }
  } catch (error) {
    throw new Error('DATABASE_URL must be a valid PostgreSQL connection string.');
  }

  return databaseUrl;
}

function getPool() {
  const databaseUrl = getDatabaseUrl();

  if (!pool) {
    pool = new Pool({
      connectionString: databaseUrl,
      ssl: process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : undefined
    });

    pool.on('error', () => {
      console.error('Unexpected idle PostgreSQL client error.');
    });
  }

  return pool;
}

async function query(text, values = []) {
  return getPool().query(text, values);
}

module.exports = { getPool, query };
