import { fileURLToPath } from 'node:url'

/** DDL each application applies to its own database, in order. */
export const publicOntologyMigrationPaths = [
  fileURLToPath(new URL('../migrations/0001_ontology.sql', import.meta.url)),
]

/** Idempotent cold-start seed, applied after the migrations. */
export const publicOntologySeedPaths = [
  fileURLToPath(new URL('../seeds/seed_ontology.sql', import.meta.url)),
]
