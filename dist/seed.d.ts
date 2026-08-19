import type { TopicLevel, TopicSnapshot } from './navigator.js';
export type SeedConcept = {
    slug: string;
    name: string;
    level: TopicLevel;
    summary: string;
    parents?: string[];
    aliases?: string[];
    emoji?: string;
};
export declare const SEED_VERSION = 1;
export declare const SEED_CONCEPTS: SeedConcept[];
export type SeedSnapshotOptions = {
    versionId?: string;
    version?: number;
};
/**
 * Materialize the seed as an immutable navigator snapshot. Concept ids are
 * their slugs, `childIds` derive from declared parents (in seed order), and
 * `primaryPath` follows each concept's first declared parent chain.
 */
export declare function buildSeedSnapshot(options?: SeedSnapshotOptions): TopicSnapshot;
export declare function buildSnapshot(seed: readonly SeedConcept[], options?: SeedSnapshotOptions): TopicSnapshot;
/** Alias lookup keyed by durable normalized label, spanning names and aliases. */
export declare function seedAliasIndex(seed?: readonly SeedConcept[]): Map<string, string>;
