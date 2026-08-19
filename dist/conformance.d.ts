import { type TopicLevel, type TopicSnapshot } from './navigator.js';
/** The surface a chooser skin must expose to prove conformance. */
export type ChooserAdapter = {
    reset(snapshot: TopicSnapshot): void;
    /** React to the user picking a concept (by id) in any band or search result. */
    choose(conceptId: string): void;
    /** Current concept ids per band, in displayed order. */
    bands(): Record<TopicLevel, string[]>;
    /** Highlighted concept id per band, if any. */
    activeIds(): Partial<Record<TopicLevel, string>>;
    /** The concept the skin would act on (subscribe/nominate/select). */
    activeId(): string;
    /** Search result concept ids, in displayed order. */
    search(query: string): string[];
};
export type ConformanceFailure = {
    step: string;
    field: string;
    expected: unknown;
    actual: unknown;
};
export declare function runChooserConformance(adapter: ChooserAdapter, snapshot?: TopicSnapshot): ConformanceFailure[];
/** The reference adapter: the engine wired to itself. Must always pass. */
export declare function referenceChooserAdapter(): ChooserAdapter;
