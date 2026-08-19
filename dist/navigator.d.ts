import { normalizeTopicLabel } from './normalization.js';
export declare const topicLevels: readonly ["area", "focus", "topic"];
export type TopicLevel = (typeof topicLevels)[number];
export type TopicNavigatorMode = "browse" | "interests";
export type TopicConcept = {
    id: string;
    slug: string;
    name: string;
    summary: string;
    level: TopicLevel;
    selectable: boolean;
    parentIds: string[];
    childIds: string[];
    primaryPath: string[];
};
export type TopicSnapshot = {
    versionId: string;
    version: number;
    concepts: TopicConcept[];
};
export type TopicBands = Record<TopicLevel, TopicConcept[]>;
export type TopicNavigatorRoute = {
    areaId?: string;
    focusId?: string;
    topicId?: string;
};
export type TopicNavigatorRouteReferences = {
    area?: string | null;
    focus?: string | null;
    topic?: string | null;
};
export type TopicSearchPayload = {
    results: TopicConcept[];
    canSuggest: boolean;
    exactMatchId?: string;
};
export declare const topicContentKinds: readonly ["all", "talk", "person", "event", "project", "company", "video", "photo"];
export type TopicContentKind = (typeof topicContentKinds)[number];
export declare const topicContentSorts: readonly ["newest", "relevance", "strength", "name"];
export type TopicContentSort = (typeof topicContentSorts)[number];
export type TopicContentItem = {
    id: string;
    kind: Exclude<TopicContentKind, "all">;
    name: string;
    description?: string | null;
    imageUrl?: string | null;
    href?: string | null;
    sourceUrl?: string | null;
    relationship?: string | null;
    strength?: number | null;
    occurredAt?: string | null;
    publishedAt?: string | null;
    activityAt?: string | null;
    updatedAt?: string | null;
};
export type TopicContentResult = {
    items: TopicContentItem[];
    counts: Partial<Record<TopicContentKind, number>>;
    total: number;
    nextCursor: string | null;
    kind: TopicContentKind;
    sort: TopicContentSort;
};
export type TopicPathStep = {
    ordinal: number;
    action: string;
    fromId?: string;
    toId?: string;
    level?: TopicLevel;
    rank?: number;
    optionCount?: number;
    elapsedMs?: number;
};
/** Returns the prior choice when a new choice semantically backtracks. */
export declare function topicChoiceBacktrackContext(steps: readonly TopicPathStep[], next: Pick<TopicConcept, "id" | "level">): TopicPathStep | null;
export declare function topicConceptMap(snapshot: TopicSnapshot): Map<string, TopicConcept>;
export declare function topicPrimaryTrail(snapshot: TopicSnapshot, activeId?: string | null): TopicConcept[];
export declare function topicPrimaryRoute(snapshot: TopicSnapshot, activeId?: string | null): TopicNavigatorRoute;
/** Resolve a URL or caller-provided route without allowing nonexistent graph edges. */
export declare function topicNavigatorRoute(snapshot: TopicSnapshot, references?: TopicNavigatorRouteReferences | TopicNavigatorRoute): TopicNavigatorRoute;
/** Keep the ancestors the user actually traversed when the chosen edge is valid. */
export declare function topicRouteAfterChoice(snapshot: TopicSnapshot, current: TopicNavigatorRoute, concept: TopicConcept): TopicNavigatorRoute;
export declare function topicRouteActiveId(route: TopicNavigatorRoute): string;
export declare function topicRouteTrail(snapshot: TopicSnapshot, route: TopicNavigatorRoute): TopicConcept[];
export declare function topicRouteLabel(snapshot: TopicSnapshot, route: TopicNavigatorRoute): string;
export declare function topicRouteReferences(snapshot: TopicSnapshot, route: TopicNavigatorRoute): TopicNavigatorRouteReferences;
export declare function topicRouteFromSearchParams(snapshot: TopicSnapshot, search: string | URLSearchParams): TopicNavigatorRoute;
export declare function topicRouteSearchParams(snapshot: TopicSnapshot, route: TopicNavigatorRoute, search?: string | URLSearchParams): URLSearchParams;
export declare function topicNavigatorBands(snapshot: TopicSnapshot, active?: string | TopicNavigatorRoute | null): TopicBands;
export declare function topicBandActiveIds(snapshot: TopicSnapshot, active?: string | TopicNavigatorRoute | null): Partial<Record<TopicLevel, string>>;
export declare function topicPathLabel(snapshot: TopicSnapshot, concept: TopicConcept): string;
/** UI callers share the exact canonical comparison key used by the API. */
export declare const normalizeTopicText: typeof normalizeTopicLabel;
/** Counts each settled search formulation once per signed navigation journey. */
export declare function rememberTopicSearchSubmission(seen: Set<string>, cacheKey: string): boolean;
export declare function localTopicSearch(snapshot: TopicSnapshot, query: string, limit?: number): TopicSearchPayload;
export declare function parseTopicSearchPayload(value: unknown, snapshot: TopicSnapshot, query: string): TopicSearchPayload;
export declare function normalizeTopicContentResult(value: unknown, fallback: Pick<TopicContentResult, "kind" | "sort"> & Partial<TopicContentResult>): TopicContentResult;
export declare function topicContentDate(item: TopicContentItem): string | null;
export declare function contentKindLabel(kind: TopicContentKind): string;
