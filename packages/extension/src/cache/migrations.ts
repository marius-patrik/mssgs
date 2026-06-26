import type Database from 'better-sqlite3';
import { MIGRATIONS, type Migration } from './schema.js';

export type { Migration };

export interface MigrationRecord {
  version: number;
  name: string;
  applied_at: string;
}

export function runMigrations(db: Database.Database): number[] {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const getCurrent = db.prepare<[], { version: number | null }>(
    'SELECT MAX(version) AS version FROM migrations',
  );
  const currentRow = getCurrent.get();
  const currentVersion = currentRow?.version ?? 0;

  const applied: number[] = [];

  for (const migration of MIGRATIONS) {
    if (migration.version <= currentVersion) {
      continue;
    }

    const apply = db.transaction(() => {
      db.exec(migration.sql);
      db.prepare('INSERT INTO migrations (version, name, applied_at) VALUES (?, ?, ?)').run(
        migration.version,
        migration.name,
        new Date().toISOString(),
      );
    });

    apply();
    applied.push(migration.version);
  }

  return applied;
}
