import type { TopicConcept, TopicSnapshot } from './navigator.js';
/** Application-owned suggestion language, keyed by canonical concept slug. */
export type ConceptLanguageModel = {
    /** Snapshot version this reviewed language was written against. */
    ontologyVersionId: string;
    /** Optional application revision for the representative corpus. */
    version?: string;
    representatives: Readonly<Record<string, string>>;
};
export type ConceptTextMatch = {
    concept: TopicConcept;
    score: number;
};
export type ConceptTextIndex = {
    similarities(query: string): number[];
    search(query: string, limit?: number): ConceptTextMatch[];
};
/**
 * TF-IDF suggestions over concept descriptions and optional representative
 * language. Rows and queries use log-TF, smoothed IDF, stopword removal, light
 * stemming, and L2 normalization. Representative text is never an exact alias
 * or extraction key; a person must confirm every semantic suggestion.
 *
 * A model applies only to its declared snapshot version. Each call builds an
 * independent index, so two applications can use different models over the
 * same immutable snapshot without leaking representative language.
 */
export declare function createConceptTextIndex(snapshot: TopicSnapshot, model?: ConceptLanguageModel): ConceptTextIndex;
