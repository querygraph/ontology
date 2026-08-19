export declare const TOPIC_NORMALIZATION_UNICODE_VERSION: string
export declare const TOPIC_FORMAT_CODEPOINT_RANGES: ReadonlyArray<ReadonlyArray<number>>
export declare const TOPIC_MARK_CODEPOINT_RANGES: ReadonlyArray<ReadonlyArray<number>>
export declare const TOPIC_ALPHANUMERIC_CODEPOINT_RANGES: ReadonlyArray<ReadonlyArray<number>>
export declare function normalizeTopicLabelCore(value: string): string
export declare function normalizedTopicTags(value: unknown): string[]
export declare function withNormalizedTopicTagsCore(properties: Record<string, unknown>): Record<string, unknown>
