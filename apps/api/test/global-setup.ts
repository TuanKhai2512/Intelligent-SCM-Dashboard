import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { execSync } from 'node:child_process';
import path from 'node:path';

/** Starts a throwaway Postgres 16 container and migrates it. Requires Docker. */
export default async function globalSetup() {
  const container = await new PostgreSqlContainer('postgres:16-alpine').start();
  const url = container.getConnectionUri();

  process.env.DATABASE_URL = url;
  process.env.JWT_SECRET = 'e2e-secret-at-least-16-chars';
  process.env.JWT_TTL_SECONDS = '28800';

  execSync('pnpm exec prisma migrate deploy', {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'inherit',
  });

  (globalThis as Record<string, unknown>).__PG_CONTAINER__ = container;
}
