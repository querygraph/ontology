import {
  isExactOnlyTopicLabel,
  normalizeTopicLabel,
  topicAcronym,
  topicLabelTokens,
  validateTopicLabel,
} from './normalization.js'

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

const collator = new Intl.Collator("en", { sensitivity: "base", numeric: true });

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.max(minimum, Math.min(value, maximum));
}

function rounded(value: number) {
  return Number(value.toFixed(6));
}

export function levenshteinDistance(left: string, right: string) {
  const a = [...left];
  const b = [...right];
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let row = 1; row <= a.length; row += 1) {
    const current = [row];
    for (let column = 1; column <= b.length; column += 1) {
      current[column] = Math.min(
        current[column - 1] + 1,
        previous[column] + 1,
        previous[column - 1] + Number(a[row - 1] !== b[column - 1]),
      );
    }
    previous = current;
  }
  return previous[b.length];
}

function editSimilarity(left: string, right: string) {
  const maximum = Math.max([...left].length, [...right].length);
  return maximum ? 1 - levenshteinDistance(left, right) / maximum : 1;
}

function trigrams(value: string) {
  const padded = `  ${value}  `;
  const values = new Map<string, number>();
  for (let index = 0; index <= padded.length - 3; index += 1) {
    const trigram = padded.slice(index, index + 3);
    values.set(trigram, (values.get(trigram) || 0) + 1);
  }
  return values;
}

function trigramSimilarity(left: string, right: string) {
  const a = trigrams(left);
  const b = trigrams(right);
  let overlap = 0;
  for (const [trigram, count] of a) overlap += Math.min(count, b.get(trigram) || 0);
  const sizeA = [...a.values()].reduce((sum, count) => sum + count, 0);
  const sizeB = [...b.values()].reduce((sum, count) => sum + count, 0);
  return sizeA + sizeB ? 2 * overlap / (sizeA + sizeB) : 1;
}

function tokenSimilarity(left: string, right: string) {
  const a = new Set(topicLabelTokens(left));
  const b = new Set(topicLabelTokens(right));
  if (!a.size || !b.size) return 0;
  const overlap = [...a].filter((token) => b.has(token)).length;
  return overlap / (a.size + b.size - overlap);
}

function fuzzyBaseScore(query: string, candidate: string) {
  return 0.5 * trigramSimilarity(query, candidate)
    + 0.35 * editSimilarity(query, candidate)
    + 0.15 * tokenSimilarity(query, candidate);
}

function fuzzyThreshold(query: string) {
  const length = [...query.replace(/\s/gu, "")].length;
  if (length <= 2) return 1;
  if (length <= 5) return 0.69;
  if (length <= 9) return 0.56;
  return 0.49;
}

function boundedSignal(value: number | undefined) {
  if (!Number.isFinite(value) || !value || value <= 0) return 0;
  return Math.log1p(Math.min(value, 1_000_000)) / Math.log1p(1_000_000);
}

function candidateBoosts(topic: MatchableTopic, selectedAncestors: ReadonlySet<string>) {
  const ancestryBoost = topic.ancestorIds?.some((id) => selectedAncestors.has(id)) ? 0.08 : 0;
  return {
    ancestryBoost,
    evidenceBoost: 0.06 * boundedSignal(topic.evidence),
    popularityBoost: 0.04 * boundedSignal(topic.popularity),
  };
}

function aliasIsApproved(alias: TopicAlias) {
  return alias.status ? alias.status === "approved" : alias.approved === true;
}

function sortCandidates(left: TopicMatchCandidate, right: TopicMatchCandidate) {
  const methodRank: Record<TopicMatchMethod, number> = {
    canonical_exact: 0,
    alias_exact: 1,
    prefix: 2,
    acronym: 3,
    fuzzy: 4,
  };
  return right.score - left.score
    || methodRank[left.method] - methodRank[right.method]
    || collator.compare(left.topic.label, right.topic.label)
    || left.topic.id.localeCompare(right.topic.id)
    || collator.compare(left.matchedLabel, right.matchedLabel)
    || (left.matchedAliasId || "").localeCompare(right.matchedAliasId || "");
}

function exactCandidate(topic: MatchableTopic, method: "canonical_exact" | "alias_exact", matchedLabel: string, matchedAliasId?: string): TopicMatchCandidate {
  const baseScore = method === "canonical_exact" ? 1 : 0.98;
  return {
    topic,
    method,
    score: baseScore,
    baseScore,
    ancestryBoost: 0,
    evidenceBoost: 0,
    popularityBoost: 0,
    matchedLabel,
    ...(matchedAliasId ? { matchedAliasId } : {}),
  };
}

function fuzzyCandidate(
  query: string,
  topic: MatchableTopic,
  selectedAncestors: ReadonlySet<string>,
): TopicMatchCandidate | null {
  const labels = [
    { label: topic.label, aliasId: undefined as string | undefined, approved: true },
    ...(topic.aliases || []).filter((alias) => alias.status !== "rejected")
      .map((alias) => ({ label: alias.label, aliasId: alias.id, approved: aliasIsApproved(alias) })),
  ];
  let best: { method: "prefix" | "acronym" | "fuzzy"; baseScore: number; label: string; aliasId?: string } | null = null;
  for (const label of labels) {
    const normalized = normalizeTopicLabel(label.label);
    if (!normalized) continue;
    let method: "prefix" | "acronym" | "fuzzy" = "fuzzy";
    let baseScore = fuzzyBaseScore(query, normalized);
    if (normalized.startsWith(query) || query.startsWith(normalized)) {
      method = "prefix";
      baseScore = Math.max(baseScore, 0.74 + 0.12 * Math.min(query.length, normalized.length) / Math.max(query.length, normalized.length));
    } else if (topicAcronym(normalized) === query || topicAcronym(query) === normalized) {
      method = "acronym";
      baseScore = Math.max(baseScore, label.approved ? 0.88 : 0.82);
    }
    if (!best || baseScore > best.baseScore || baseScore === best.baseScore && normalized < normalizeTopicLabel(best.label)) {
      best = { method, baseScore, label: label.label, ...(label.aliasId ? { aliasId: label.aliasId } : {}) };
    }
  }
  if (!best || best.baseScore < fuzzyThreshold(query)) return null;
  const boosts = candidateBoosts(topic, selectedAncestors);
  return {
    topic,
    method: best.method,
    baseScore: rounded(best.baseScore),
    score: rounded(clamp(best.baseScore + boosts.ancestryBoost + boosts.evidenceBoost + boosts.popularityBoost, 0, 0.97)),
    ancestryBoost: rounded(boosts.ancestryBoost),
    evidenceBoost: rounded(boosts.evidenceBoost),
    popularityBoost: rounded(boosts.popularityBoost),
    matchedLabel: best.label,
    ...(best.aliasId ? { matchedAliasId: best.aliasId } : {}),
  };
}

/**
 * Match a user-entered interest against visible ontology nodes.
 *
 * Only a unique exact canonical label or approved alias is reusable. Prefix,
 * acronym, edit-distance, and other fuzzy evidence can only produce choices
 * for the user; it can never merge or silently select a topic.
 */
export function matchTopics(query: string, topics: readonly MatchableTopic[], options: TopicMatchOptions = {}): TopicMatchResult {
  const validation = validateTopicLabel(query);
  const exactOnly = isExactOnlyTopicLabel(query);
  if (!validation.valid) {
    return {
      query,
      normalizedQuery: validation.normalized,
      decision: "invalid",
      candidates: [],
      exactOnly,
      validationError: validation.reason,
    };
  }
  const normalizedQuery = validation.normalized;
  const visible = topics.filter((topic) => (topic.status || "active") !== "rejected" && (topic.status || "active") !== "merged");
  const canonical = visible.filter((topic) => !topic.status || topic.status === "active" || topic.status === "canonical");
  const canonicalExact = canonical.filter((topic) => normalizeTopicLabel(topic.label) === normalizedQuery);
  const canonicalCandidates = canonicalExact.map((topic) => exactCandidate(topic, "canonical_exact", topic.label));
  if (canonicalCandidates.length === 1) {
    return { query, normalizedQuery, decision: "reuse", candidates: canonicalCandidates, reusableTopicId: canonicalCandidates[0].topic.id, exactOnly };
  }
  if (canonicalCandidates.length > 1) {
    return { query, normalizedQuery, decision: "suggest", candidates: canonicalCandidates.sort(sortCandidates), exactOnly };
  }

  const aliasExact = canonical.flatMap((topic) => (topic.aliases || []).flatMap((alias) =>
    aliasIsApproved(alias) && normalizeTopicLabel(alias.label) === normalizedQuery
      ? [exactCandidate(topic, "alias_exact", alias.label, alias.id)]
      : []));
  const uniqueAliasTopics = new Set(aliasExact.map((candidate) => candidate.topic.id));
  if (uniqueAliasTopics.size === 1) {
    const candidates = aliasExact.sort(sortCandidates);
    return { query, normalizedQuery, decision: "reuse", candidates, reusableTopicId: candidates[0].topic.id, exactOnly };
  }
  if (aliasExact.length) return { query, normalizedQuery, decision: "suggest", candidates: aliasExact.sort(sortCandidates), exactOnly };
  if (exactOnly) return { query, normalizedQuery, decision: "new", candidates: [], exactOnly };

  const selectedAncestors = new Set(options.selectedAncestorIds || []);
  const minimumScore = Number.isFinite(options.minimumScore)
    ? clamp(options.minimumScore!, 0, 1)
    : fuzzyThreshold(normalizedQuery);
  const limit = Number.isFinite(options.limit)
    ? Math.max(1, Math.min(Math.trunc(options.limit!), 25))
    : 8;
  const fuzzy = visible.flatMap((topic) => {
    const candidate = fuzzyCandidate(normalizedQuery, topic, selectedAncestors);
    return candidate && candidate.baseScore >= minimumScore ? [candidate] : [];
  }).sort(sortCandidates).slice(0, limit);
  return { query, normalizedQuery, decision: fuzzy.length ? "suggest" : "new", candidates: fuzzy, exactOnly };
}

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
export function gateTopicProposal(result: TopicMatchResult, input: TopicProposalInput): TopicProposalGate {
  const reasons: string[] = [];
  const likelyMatchIds = [...new Set(result.candidates.filter((candidate) => candidate.score >= 0.84).map((candidate) => candidate.topic.id))];
  if (result.decision === "invalid") reasons.push(result.validationError || "The topic name is invalid.");
  if (result.decision === "reuse") reasons.push("Use the existing matching topic.");
  if (result.candidates.some((candidate) => candidate.method === "canonical_exact" || candidate.method === "alias_exact")) {
    reasons.push("Resolve the exact existing-name match instead of creating another topic.");
  }
  if (!input.selectedParentId?.trim()) reasons.push("Choose the closest broader topic.");
  else if (input.selectedParentId.length > 240) reasons.push("The broader topic selection is invalid.");
  const definition = input.definition?.trim().replace(/\s+/gu, " ") || "";
  if (definition.length < 12) reasons.push("Add a short explanation of what this topic means.");
  if (definition.length > 500) reasons.push("Keep the topic explanation to 500 characters or fewer.");
  if (result.candidates.length && !input.confirmedNoMatch) reasons.push("Review the suggested existing topics first.");
  return { allowed: reasons.length === 0, reasons: [...new Set(reasons)], likelyMatchIds };
}
