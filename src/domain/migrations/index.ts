import { up as up001 } from './001_create_items_table';
import { up as up002 } from './002_add_universal_id';
import { up as up003 } from './003_create_estimates_table';
import { up as up004 } from './004_add_raw_text_and_source';
import { up as up005 } from './005_add_estimate_snapshot';

// Ordered list of migrations. The runner applies any whose `id` is not yet
// recorded in the schema_migrations table. Append new migrations to the end —
// never reorder or rewrite an already-applied one.
export interface Migration {
  id: string;
  up: () => Promise<void>;
}

export const migrations: Migration[] = [
  { id: '001_create_items_table', up: up001 },
  { id: '002_add_universal_id', up: up002 },
  { id: '003_create_estimates_table', up: up003 },
  { id: '004_add_raw_text_and_source', up: up004 },
  { id: '005_add_estimate_snapshot', up: up005 },
];
