import pg from 'pg';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import path from 'path';

const MIGRATIONS_DIR = fileURLToPath(new URL('../migrations', import.meta.url));

// DATABASE_URL=memory — база в памяти (pg-mem) для локального запуска и тестов
export async function createPool(url = process.env.DATABASE_URL || '') {
  if (url === 'memory') {
    const { newDb } = await import('pg-mem');
    const { Pool } = newDb().adapters.createPg();
    return Object.assign(new Pool(), { isMemory: true });
  }
  const needSsl = process.env.PGSSLMODE
    ? process.env.PGSSLMODE !== 'disable'
    : !(url.includes('.internal') || url.includes('localhost') || url.includes('127.0.0.1'));
  // Таймауты: если база молча недоступна, запросы падают, а не висят вечно (рестарт по healthcheck)
  const pool = new pg.Pool({
    connectionString: url, ssl: needSsl ? { rejectUnauthorized: false } : false,
    max: 10, connectionTimeoutMillis: 10_000, idleTimeoutMillis: 30_000,
    statement_timeout: 15_000, query_timeout: 20_000
  });
  // Обрыв простаивающего соединения (рестарт Postgres) не должен ронять процесс
  pool.on('error', (e) => console.error('pg pool error:', e.message));
  return pool;
}

const MIGRATION_LOCK = 7_340_221; // advisory lock: два инстанса не накатывают миграции одновременно

// Прогоняет migrations/NNN_*.sql и NNN_*.mjs (export async function up(client)) по порядку, каждую один раз.
// .mjs — для переноса данных, которого не выразить переносимым SQL (pg-mem в тестах).
// Старые файлы не трогать: любое изменение схемы — новым файлом. until — для тестов миграций.
export async function migrate(db, { until = Infinity } = {}) {
  const client = await db.connect();
  try {
    if (!db.isMemory) await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK]);
    // Без IF NOT EXISTS: pg-mem падает на нём, когда таблица уже есть (повторный migrate)
    const has = await client.query(
      `SELECT 1 FROM information_schema.tables WHERE table_name='schema_migrations' AND table_schema=current_schema()`);
    if (!has.rows[0]) {
      await client.query(`CREATE TABLE schema_migrations
        (version INT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
    }
    const files = readdirSync(MIGRATIONS_DIR).filter(f => /^\d+_.+\.(sql|mjs)$/.test(f)).sort();
    for (const file of files) {
      const version = parseInt(file, 10);
      if (version > until) break;
      const done = await client.query(`SELECT 1 FROM schema_migrations WHERE version=$1`, [version]);
      if (done.rows[0]) continue;
      const full = path.join(MIGRATIONS_DIR, file);
      try {
        await client.query('BEGIN');
        if (file.endsWith('.mjs')) await (await import(pathToFileURL(full).href)).up(client);
        else await client.query(readFileSync(full, 'utf8'));
        await client.query(`INSERT INTO schema_migrations (version) VALUES ($1)`, [version]);
        await client.query('COMMIT');
        console.log(`migration ${file} applied`);
      } catch (e) {
        await client.query('ROLLBACK');
        throw new Error(`migration ${file} failed: ${e.message}`);
      }
    }
  } finally {
    if (!db.isMemory) await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK]).catch(() => {});
    client.release();
  }
}
