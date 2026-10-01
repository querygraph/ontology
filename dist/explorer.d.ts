import { type TopicConcept, type TopicSnapshot } from './navigator.js';
import { type ConceptTextIndex } from './concept-text.js';
export type OntologyExplorerOptions = {
    /** Optional application language model, built over this same snapshot. */
    textIndex?: ConceptTextIndex;
    /** Approved labels mapped to canonical concept IDs; labels are normalized internally. */
    exactAliases?: ReadonlyMap<string, string>;
};
export type OntologyRecommendation = {
    concept: TopicConcept;
    /** Information gain in bits for recommendation rows; text relevance for textMatches. */
    score: number;
};
export type OntologyRecommendations = {
    /** Ancestors of the current filing choice (the last selected concept). */
    general: OntologyRecommendation[];
    /** Descendants of the current filing choice (the last selected concept). */
    specific: OntologyRecommendation[];
    different: OntologyRecommendation[];
};
export type OntologyPosterior = {
    /** Shannon entropy of the current concept distribution, in bits. */
    entropy: number;
    probabilities: Array<{
        concept: TopicConcept;
        probability: number;
    }>;
};
export type OntologyExplorer = {
    selectedIds(): string[];
    selectedConcepts(): TopicConcept[];
    /** The most recently chosen concept; this is the filing choice when a form needs one value. */
    lastSelectedId(): string | null;
    toggle(conceptId: string): void;
    clear(): void;
    /** Exact canonical/approved-alias, semantic representative-text, then fuzzy local matches. */
    textMatches(query: string, limit?: number): OntologyRecommendation[];
    posterior(query?: string): OntologyPosterior;
    recommendations(query?: string, limit?: number): OntologyRecommendations;
};
/**
 * Multi-selection exploration over the ontology DAG. This deliberately wraps
 * rather than changes the single-route navigator contract. Free text
 * supplies the prior over possible concepts. Every shelf choice is then a
 * positive Bayesian observation over that prior. Candidate chips are treated
 * as noisy yes/no questions, so the "different" row can greedily maximize
 * expected posterior entropy reduction while covering unexplored regions.
 */
export declare function createOntologyExplorer(snapshot?: TopicSnapshot, options?: OntologyExplorerOptions): OntologyExplorer;
export declare const ONTOLOGY_POSTERIOR_SAMPLE_LIMIT = 192;
