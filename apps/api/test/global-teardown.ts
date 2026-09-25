import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';

export default async function globalTeardown() {
  const container = (globalThis as Record<string, unknown>).__PG_CONTAINER__ as
    | StartedPostgreSqlContainer
    | undefined;
  await container?.stop();
}
