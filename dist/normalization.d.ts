export { TOPIC_NORMALIZATION_UNICODE_VERSION, TOPIC_FORMAT_CODEPOINT_RANGES, TOPIC_MARK_CODEPOINT_RANGES, TOPIC_ALPHANUMERIC_CODEPOINT_RANGES, } from './normalization-core.mjs';
/**
 * Produce the stable comparison key used by topic names and aliases.
 *
 * `+`, `#`, `.`, and `/` are deliberately meaningful. Treating every piece
 * of punctuation as whitespace would collapse C, C++, C#, .NET, Node.js, and
 * CI/CD into dangerously similar keys.
 */
export declare function normalizeTopicLabel(value: string): string;
export declare function normalizedTopicTags(value: unknown): string[];
export declare function withNormalizedTopicTags(properties: Record<string, unknown>): Record<string, unknown>;
export declare function topicLabelTokens(value: string): string[];
/** Short developer terms are common and must not receive fuzzy matches. */
export declare function isExactOnlyTopicLabel(value: string): boolean;
export declare function topicAcronym(value: string): string;
export type TopicLabelValidation = {
    valid: true;
    display: string;
    normalized: string;
} | {
    valid: false;
    display: string;
    normalized: string;
    reason: string;
};
export declare function validateTopicLabel(value: string, maximumLength?: number): TopicLabelValidation;
