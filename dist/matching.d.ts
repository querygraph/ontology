export type TopicAlias = {
    id?: string;
    label: string;
    status?: "approved" | "pending" | "rejected";
    /** Compatibility for pre-schema callers; status takes precedence. */
    approved?: boolean;
};
export type MatchableTopic = {
    id: string;
    label: string;
    /** `canonical` is accepted for already-projected API records. */
    status?: "active" | "canonical" | "deprecated" | "merged" | "proposed" | "rejected";
    aliases?: readonly TopicAlias[];
    /** Every semantic ancestor, not only the primary UI route. */
    ancestorIds?: readonly string[];
    /** Bounded graph/content evidence supporting this topic. */
    evidence?: number;
    /** Bounded observed selection/content popularity. */
    popularity?: number;
};
export type TopicMatchMethod = "canonical_exact" | "alias_exact" | "prefix" | "acronym" | "fuzzy";
export type TopicMatchCandidate = {
    topic: MatchableTopic;
    method: TopicMatchMethod;
    score: number;
    baseScore: number;
    ancestryBoost: number;
    evidenceBoost: number;
    popularityBoost: number;
    matchedLabel: string;
    matchedAliasId?: string;
};
export type TopicMatchResult = {
    query: string;
    normalizedQuery: string;
    decision: "invalid" | "reuse" | "suggest" | "new";
    candidates: TopicMatchCandidate[];
    reusableTopicId?: string;
    exactOnly: boolean;
    validationError?: string;
};
export type TopicMatchOptions = {
    selectedAncestorIds?: readonly string[];
    limit?: number;
    minimumScore?: number;
};
export declare function levenshteinDistance(left: string, right: string): number;
/**
 * Match a user-entered interest against visible ontology nodes.
 *
 * Only a unique exact canonical label or approved alias is reusable. Prefix,
 * acronym, edit-distance, and other fuzzy evidence can only produce choices
 * for the user; it can never merge or silently select a topic.
 */
export declare function matchTopics(query: string, topics: readonly MatchableTopic[], options?: TopicMatchOptions): TopicMatchResult;
export type TopicProposalInput = {
    selectedParentId?: string;
    definition?: string;
    confirmedNoMatch?: boolean;
};
export type TopicProposalGate = {
    allowed: boolean;
    reasons: string[];
    likelyMatchIds: string[];
};
/** Gate the explicit “add a new topic” action after matching has run. */
export declare function gateTopicProposal(result: TopicMatchResult, input: TopicProposalInput): TopicProposalGate;
