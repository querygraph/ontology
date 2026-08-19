import type { TopicConcept, TopicSnapshot } from './navigator.js';
import { type SeedConcept } from './seed.js';
export type ExtractedTopic = {
    concept: TopicConcept;
    occurrences: number;
    matches: string[];
};
export type ExtractionOptions = {
    /** Extra label→slug aliases beyond concept names and slugs. */
    aliases?: ReadonlyMap<string, string>;
    /** Longest phrase, in tokens, considered as one label. Default 4. */
    maxPhraseTokens?: number;
    limit?: number;
};
/** Index a snapshot's labels for extraction; pair with seedAliasIndex for seeds. */
export declare function snapshotLabelIndex(snapshot: TopicSnapshot): Map<string, string>;
export declare function extractTopicsFromText(text: string, snapshot: TopicSnapshot, options?: ExtractionOptions): ExtractedTopic[];
/** Convenience: extraction over the built-in seed with its aliases applied. */
export declare function extractSeedTopics(text: string, snapshot: TopicSnapshot, seed?: readonly SeedConcept[], options?: ExtractionOptions): ExtractedTopic[];
