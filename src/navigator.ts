// Extracted from devreal lib/topic-ui.ts (2026-08-19): the framework-neutral
// three-tier navigator (Area / Focus / Specific) over an immutable published
// ontology snapshot, plus local search and path/backtrack semantics.
import { isExactOnlyTopicLabel, normalizeTopicLabel } from './normalization.js'

export const topicLevels = ["area", "focus", "topic"] as const;

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
export type TopicNavigatorRoute = { areaId?: string; focusId?: string; topicId?: string };
export type TopicNavigatorRouteReferences = { area?: string | null; focus?: string | null; topic?: string | null };

export type TopicSearchPayload = {
  results: TopicConcept[];
  canSuggest: boolean;
  exactMatchId?: string;
};

export const topicContentKinds = ["all", "talk", "person", "event", "project", "company", "video", "photo"] as const;
export type TopicContentKind = (typeof topicContentKinds)[number];

export const topicContentSorts = ["newest", "relevance", "strength", "name"] as const;
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

const topicChoiceActions = new Set(["area_chosen", "focus_chosen", "topic_chosen", "search_result_chosen"]);

/** Returns the prior choice when a new choice semantically backtracks. */
export function topicChoiceBacktrackContext(steps: readonly TopicPathStep[], next: Pick<TopicConcept, "id" | "level">) {
  let choiceIndex = -1;
  for (let index = steps.length - 1; index >= 0; index -= 1) {
    if (topicChoiceActions.has(steps[index].action)) { choiceIndex = index; break; }
  }
  if (choiceIndex < 0 || steps.slice(choiceIndex + 1).some((step) => step.action === "backtrack")) return null;
  const previous = steps[choiceIndex];
  if (!previous.level || !previous.toId) return null;
  const previousRank = topicLevels.indexOf(previous.level);
  const nextRank = topicLevels.indexOf(next.level);
  return nextRank < previousRank || nextRank === previousRank && next.id !== previous.toId ? previous : null;
}

const topicSearchIndexCache = new WeakMap<TopicSnapshot, Array<{ concept: TopicConcept; name: string; summary: string }>>();

export function topicConceptMap(snapshot: TopicSnapshot) {
  return new Map(snapshot.concepts.map((concept) => [concept.id, concept]));
}

export function topicPrimaryTrail(snapshot: TopicSnapshot, activeId?: string | null) {
  const byId = topicConceptMap(snapshot);
  const bySlug = new Map(snapshot.concepts.map((concept) => [concept.slug, concept]));
  const active = activeId ? byId.get(activeId) : undefined;
  if (!active) return [];

  const trail = active.primaryPath.flatMap((part) => byId.get(part) || bySlug.get(part) || []);
  if (!trail.some((concept) => concept.id === active.id)) trail.push(active);

  // Older snapshots may carry only parent ids rather than a complete primary
  // path. Fill only missing levels; walking every unvisited parent would turn
  // a cross-listing into a replacement for the declared primary path.
  let cursor = active;
  const visited = new Set(trail.map((concept) => concept.id));
  for (let index = topicLevels.indexOf(active.level) - 1; index >= 0; index -= 1) {
    const level = topicLevels[index];
    const existing = trail.find((concept) => concept.level === level);
    if (existing) {
      cursor = existing;
      continue;
    }
    const parent = cursor.parentIds.flatMap((id) => byId.get(id) || [])
      .find((concept) => concept.level === level && !visited.has(concept.id));
    if (!parent) break;
    trail.unshift(parent);
    visited.add(parent.id);
    cursor = parent;
  }

  return topicLevels.flatMap((level) => trail.find((concept) => concept.level === level) || []);
}

export function topicPrimaryRoute(snapshot: TopicSnapshot, activeId?: string | null): TopicNavigatorRoute {
  const route: TopicNavigatorRoute = {};
  for (const concept of topicPrimaryTrail(snapshot, activeId)) {
    if (concept.level === "area") route.areaId = concept.id;
    else if (concept.level === "focus") route.focusId = concept.id;
    else route.topicId = concept.id;
  }
  return route;
}

/** Resolve a URL or caller-provided route without allowing nonexistent graph edges. */
export function topicNavigatorRoute(
  snapshot: TopicSnapshot,
  references: TopicNavigatorRouteReferences | TopicNavigatorRoute = {},
): TopicNavigatorRoute {
  const values = references as TopicNavigatorRouteReferences & TopicNavigatorRoute;
  const area = topicReference(snapshot, values.areaId || values.area, "area");
  const focus = topicReference(snapshot, values.focusId || values.focus, "focus");
  const topic = topicReference(snapshot, values.topicId || values.topic, "topic");

  if (topic) {
    if (focus && topic.parentIds.includes(focus.id)) {
      const focusRoute = area && focus.parentIds.includes(area.id)
        ? { areaId: area.id, focusId: focus.id }
        : topicPrimaryRoute(snapshot, focus.id);
      if (focusRoute.areaId) return { areaId: focusRoute.areaId, focusId: focus.id, topicId: topic.id };
    }
    return topicPrimaryRoute(snapshot, topic.id);
  }
  if (focus) {
    if (area && focus.parentIds.includes(area.id)) return { areaId: area.id, focusId: focus.id };
    return topicPrimaryRoute(snapshot, focus.id);
  }
  return area ? { areaId: area.id } : {};
}

/** Keep the ancestors the user actually traversed when the chosen edge is valid. */
export function topicRouteAfterChoice(
  snapshot: TopicSnapshot,
  current: TopicNavigatorRoute,
  concept: TopicConcept,
): TopicNavigatorRoute {
  const route = topicNavigatorRoute(snapshot, current);
  if (concept.level === "area") return { areaId: concept.id };
  if (concept.level === "focus") {
    return route.areaId && concept.parentIds.includes(route.areaId)
      ? { areaId: route.areaId, focusId: concept.id }
      : topicPrimaryRoute(snapshot, concept.id);
  }
  return route.areaId && route.focusId
      && concept.parentIds.includes(route.focusId)
      && topicReference(snapshot, route.focusId, "focus")?.parentIds.includes(route.areaId)
    ? { areaId: route.areaId, focusId: route.focusId, topicId: concept.id }
    : topicPrimaryRoute(snapshot, concept.id);
}

export function topicRouteActiveId(route: TopicNavigatorRoute) {
  return route.topicId || route.focusId || route.areaId || "";
}

export function topicRouteTrail(snapshot: TopicSnapshot, route: TopicNavigatorRoute) {
  const byId = topicConceptMap(snapshot);
  const valid = topicNavigatorRoute(snapshot, route);
  return topicLevels.flatMap((level) => byId.get(valid[`${level}Id`] || "") || []);
}

export function topicRouteLabel(snapshot: TopicSnapshot, route: TopicNavigatorRoute) {
  return topicRouteTrail(snapshot, route).map((concept) => concept.name).join(" › ");
}

export function topicRouteReferences(snapshot: TopicSnapshot, route: TopicNavigatorRoute): TopicNavigatorRouteReferences {
  const byId = topicConceptMap(snapshot);
  const valid = topicNavigatorRoute(snapshot, route);
  return {
    ...(valid.areaId ? { area: byId.get(valid.areaId)?.slug } : {}),
    ...(valid.focusId ? { focus: byId.get(valid.focusId)?.slug } : {}),
    ...(valid.topicId ? { topic: byId.get(valid.topicId)?.slug } : {}),
  };
}

export function topicRouteFromSearchParams(snapshot: TopicSnapshot, search: string | URLSearchParams) {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  return topicNavigatorRoute(snapshot, {
    area: params.get("area"),
    focus: params.get("focus"),
    topic: params.get("topic"),
  });
}

export function topicRouteSearchParams(
  snapshot: TopicSnapshot,
  route: TopicNavigatorRoute,
  search: string | URLSearchParams = "",
) {
  const params = new URLSearchParams(typeof search === "string" ? search : search.toString());
  const references = topicRouteReferences(snapshot, route);
  for (const level of topicLevels) params.delete(level);
  for (const level of topicLevels) {
    const value = references[level];
    if (value) params.set(level, value);
  }
  return params;
}

export function topicNavigatorBands(snapshot: TopicSnapshot, active: string | TopicNavigatorRoute | null = null): TopicBands {
  const byId = topicConceptMap(snapshot);
  const route = typeof active === "string" ? topicPrimaryRoute(snapshot, active) : topicNavigatorRoute(snapshot, active || {});
  const selectedArea = route.areaId ? byId.get(route.areaId) : undefined;
  const selectedFocus = route.focusId ? byId.get(route.focusId) : undefined;

  return {
    area: snapshot.concepts.filter((concept) => concept.level === "area"),
    focus: selectedArea ? orderedChildren(snapshot, selectedArea, "focus") : [],
    topic: selectedFocus ? orderedChildren(snapshot, selectedFocus, "topic") : [],
  };
}

export function topicBandActiveIds(snapshot: TopicSnapshot, active: string | TopicNavigatorRoute | null = null): Partial<Record<TopicLevel, string>> {
  const route = typeof active === "string" ? topicPrimaryRoute(snapshot, active) : topicNavigatorRoute(snapshot, active || {});
  return { area: route.areaId, focus: route.focusId, topic: route.topicId };
}

export function topicPathLabel(snapshot: TopicSnapshot, concept: TopicConcept) {
  const trail = topicPrimaryTrail(snapshot, concept.id);
  return trail.map((part) => part.name).join(" › ");
}

/** UI callers share the exact canonical comparison key used by the API. */
export const normalizeTopicText = normalizeTopicLabel;

/** Counts each settled search formulation once per signed navigation journey. */
export function rememberTopicSearchSubmission(seen: Set<string>, cacheKey: string) {
  if (seen.has(cacheKey) || seen.size >= 49) return false;
  seen.add(cacheKey);
  return true;
}

export function localTopicSearch(snapshot: TopicSnapshot, query: string, limit = 12): TopicSearchPayload {
  const needle = normalizeTopicLabel(query);
  if (!needle) return { results: [], canSuggest: false };
  const exactOnly = isExactOnlyTopicLabel(query);
  const tokens = needle.split(" ").filter(Boolean);
  const indexed = topicSearchIndex(snapshot);
  const scored = indexed.flatMap(({ concept, name, summary }) => {
    const exact = name === needle;
    if (exactOnly && !exact) return [];
    let score = exact ? 0 : name.startsWith(needle) ? 1 : name.includes(needle) ? 2
      : tokens.every((token) => name.includes(token) || summary.includes(token)) ? 3
      : topicEditDistance(name, needle) <= typoThreshold(needle) ? 4 : -1;
    if (score < 0) return [];
    if (concept.level === "topic") score -= 0.1;
    return [{ concept, score }];
  }).sort((left, right) => left.score - right.score || left.concept.name.localeCompare(right.concept.name));
  const exactMatch = scored.find(({ concept }) => normalizeTopicLabel(concept.name) === needle)?.concept;
  return {
    results: scored.slice(0, Math.max(1, limit)).map(({ concept }) => concept),
    // A short developer label such as R or Go is exact-only. Only the server,
    // which can inspect approved aliases as well as canonical topics, may open
    // the proposal gate for one of these labels.
    canSuggest: !exactOnly && !exactMatch,
    ...(exactMatch ? { exactMatchId: exactMatch.id } : {}),
  };
}

function topicSearchIndex(snapshot: TopicSnapshot) {
  const cached = topicSearchIndexCache.get(snapshot);
  if (cached) return cached;
  const indexed = snapshot.concepts.map((concept) => ({
    concept,
    name: normalizeTopicLabel(concept.name),
    summary: normalizeTopicLabel(concept.summary),
  }));
  topicSearchIndexCache.set(snapshot, indexed);
  return indexed;
}

export function parseTopicSearchPayload(value: unknown, snapshot: TopicSnapshot, query: string): TopicSearchPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) return localTopicSearch(snapshot, query);
  const record = value as Record<string, unknown>;
  const candidates = [record.results, record.matches, record.topics, record.concepts].find(Array.isArray);
  const byId = topicConceptMap(snapshot);
  const results = (Array.isArray(candidates) ? candidates : []).flatMap((candidate) => {
    if (typeof candidate === "string") return byId.get(candidate) || [];
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return [];
    const item = candidate as Record<string, unknown>;
    const existing = typeof item.id === "string" ? byId.get(item.id) : undefined;
    // Results are a projection of the immutable snapshot already on screen.
    // A concept from another version must not enter these rails.
    return existing || [];
  });
  const local = localTopicSearch(snapshot, query);
  const serverExact = stringValue(record.exactMatchId) || stringValue(record.exact_match_id);
  const exactMatchId = serverExact && byId.has(serverExact) ? serverExact : local.exactMatchId;
  const canSuggestValue = record.canSuggest ?? record.can_suggest ?? record.canPropose ?? record.can_propose;
  return {
    results: results.length ? uniqueConcepts(results) : local.results,
    // Once a server response exists, only its explicit reconciliation decision
    // may open the proposal gate. A malformed or partial response fails closed.
    canSuggest: typeof canSuggestValue === "boolean" ? canSuggestValue && !exactMatchId : false,
    ...(exactMatchId ? { exactMatchId } : {}),
  };
}

export function normalizeTopicContentResult(
  value: unknown,
  fallback: Pick<TopicContentResult, "kind" | "sort"> & Partial<TopicContentResult>,
): TopicContentResult {
  const record = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const rawItems = [record.items, record.contents, record.entities, record.results].find(Array.isArray);
  const items = (Array.isArray(rawItems) ? rawItems : fallback.items || []).flatMap(parseTopicContentItem);
  const counts = parseContentCounts(record.counts) || fallback.counts || {};
  const rawKind = stringValue(record.kind) || fallback.kind;
  const rawSort = stringValue(record.sort) || fallback.sort;
  return {
    items,
    counts,
    total: finiteNonnegative(record.total) ?? fallback.total ?? items.length,
    nextCursor: opaqueCursor(record.nextCursor) || opaqueCursor(record.next_cursor) || fallback.nextCursor || null,
    kind: isTopicContentKind(rawKind) ? rawKind : "all",
    sort: isTopicContentSort(rawSort) ? rawSort : "newest",
  };
}

export function topicContentDate(item: TopicContentItem) {
  return item.occurredAt || item.publishedAt || item.activityAt || item.updatedAt || null;
}

export function contentKindLabel(kind: TopicContentKind) {
  const labels: Record<TopicContentKind, string> = {
    all: "All", talk: "Talks", person: "People", event: "Events", project: "Projects",
    company: "Companies", video: "Videos", photo: "Photos",
  };
  return labels[kind];
}

function orderedChildren(snapshot: TopicSnapshot, parent: TopicConcept, level: TopicLevel) {
  const byId = topicConceptMap(snapshot);
  const explicitlyOrdered = parent.childIds.flatMap((id) => {
    const concept = byId.get(id);
    return concept?.level === level ? [concept] : [];
  });
  const seen = new Set(explicitlyOrdered.map((concept) => concept.id));
  const remaining = snapshot.concepts.filter((concept) => concept.level === level && concept.parentIds.includes(parent.id) && !seen.has(concept.id));
  return [...explicitlyOrdered, ...remaining];
}

function topicReference(snapshot: TopicSnapshot, reference: string | null | undefined, level: TopicLevel) {
  if (!reference) return undefined;
  return snapshot.concepts.find((concept) => concept.level === level && (concept.id === reference || concept.slug === reference));
}

function topicEditDistance(left: string, right: string) {
  if (Math.abs(left.length - right.length) > typoThreshold(right)) return Number.POSITIVE_INFINITY;
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length];
}

function typoThreshold(value: string) {
  return value.length >= 8 ? 2 : value.length >= 4 ? 1 : 0;
}

function parseTopicContentItem(value: unknown): TopicContentItem[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const item = value as Record<string, unknown>;
  const id = stringValue(item.id);
  const kind = stringValue(item.kind);
  const name = stringValue(item.name) || stringValue(item.label) || stringValue(item.title);
  if (!id || !name || !isTopicContentKind(kind) || kind === "all") return [];
  return [{
    id, kind, name,
    description: stringValue(item.description) || stringValue(item.subtitle) || null,
    imageUrl: stringValue(item.imageUrl) || stringValue(item.image_url) || null,
    href: stringValue(item.href) || stringValue(item.url) || null,
    sourceUrl: stringValue(item.sourceUrl) || stringValue(item.source_url) || null,
    relationship: stringValue(item.relationship) || stringValue(item.relationshipLabel) || stringValue(item.relationship_label) || null,
    strength: finiteNonnegative(item.strength) ?? null,
    occurredAt: stringValue(item.occurredAt) || stringValue(item.occurred_at) || stringValue(item.domainDate) || stringValue(item.domain_date) || null,
    publishedAt: stringValue(item.publishedAt) || stringValue(item.published_at) || null,
    activityAt: stringValue(item.activityAt) || stringValue(item.activity_at) || null,
    updatedAt: stringValue(item.updatedAt) || stringValue(item.updated_at) || null,
  }];
}

function parseContentCounts(value: unknown): Partial<Record<TopicContentKind, number>> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const counts: Partial<Record<TopicContentKind, number>> = {};
  const aliases: Record<string, TopicContentKind> = {
    all: "all", talks: "talk", talk: "talk", people: "person", persons: "person", person: "person",
    events: "event", event: "event", projects: "project", project: "project",
    companies: "company", company: "company", videos: "video", video: "video", photos: "photo", photo: "photo",
  };
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const normalized = aliases[key];
    if (normalized) counts[normalized] = finiteNonnegative(raw) ?? 0;
  }
  return counts;
}

function uniqueConcepts(concepts: TopicConcept[]) {
  return [...new Map(concepts.map((concept) => [concept.id, concept])).values()];
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function finiteNonnegative(value: unknown) {
  const number = typeof value === "number" ? value : typeof value === "string" && value ? Number(value) : Number.NaN;
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

function opaqueCursor(value: unknown) {
  return stringValue(value);
}

function isTopicContentKind(value: string | undefined): value is TopicContentKind {
  return Boolean(value && (topicContentKinds as readonly string[]).includes(value));
}

function isTopicContentSort(value: string | undefined): value is TopicContentSort {
  return Boolean(value && (topicContentSorts as readonly string[]).includes(value));
}
