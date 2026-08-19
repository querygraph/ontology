// Extracted from devreal lib/topic-normalization.ts (2026-08-19). The core
// tables and algorithm in normalization-core.mjs are a durable, reviewed
// normalizer version: Unicode upgrades must change core and consumers as one
// explicit change, never implicitly through a runtime upgrade.
import {
  normalizeTopicLabelCore,
  normalizedTopicTags as normalizedTopicTagsCore,
  withNormalizedTopicTagsCore,
} from './normalization-core.mjs'

export {
  TOPIC_NORMALIZATION_UNICODE_VERSION,
  TOPIC_FORMAT_CODEPOINT_RANGES,
  TOPIC_MARK_CODEPOINT_RANGES,
  TOPIC_ALPHANUMERIC_CODEPOINT_RANGES,
} from './normalization-core.mjs'

/**
 * Produce the stable comparison key used by topic names and aliases.
 *
 * `+`, `#`, `.`, and `/` are deliberately meaningful. Treating every piece
 * of punctuation as whitespace would collapse C, C++, C#, .NET, Node.js, and
 * CI/CD into dangerously similar keys.
 */
export function normalizeTopicLabel(value: string): string {
  return normalizeTopicLabelCore(value)
}

export function normalizedTopicTags(value: unknown): string[] {
  return normalizedTopicTagsCore(value)
}

export function withNormalizedTopicTags(properties: Record<string, unknown>): Record<string, unknown> {
  return withNormalizedTopicTagsCore(properties)
}

export function topicLabelTokens(value: string): string[] {
  const normalized = normalizeTopicLabel(value)
  return normalized ? normalized.split(/[\s/]+/gu).filter(Boolean) : []
}

/** Short developer terms are common and must not receive fuzzy matches. */
export function isExactOnlyTopicLabel(value: string): boolean {
  return [...normalizeTopicLabel(value).replace(/\s/gu, '')].length <= 2
}

export function topicAcronym(value: string): string {
  const tokens = topicLabelTokens(value).flatMap((token) => token.split(/[.+#]+/gu).filter(Boolean))
  return tokens.length > 1 ? tokens.map((token) => [...token][0] || '').join('') : ''
}

export type TopicLabelValidation =
  | { valid: true, display: string, normalized: string }
  | { valid: false, display: string, normalized: string, reason: string }

export function validateTopicLabel(value: string, maximumLength = 80): TopicLabelValidation {
  const display = value.normalize('NFKC').trim().replace(/\s+/gu, ' ')
  const normalized = normalizeTopicLabel(display)
  if (!display) return { valid: false, display, normalized, reason: 'Enter a topic name.' }
  if (/[\p{Cc}\p{Cf}]/u.test(value.replace(/\s/gu, ''))) {
    return { valid: false, display, normalized, reason: 'Topic names cannot contain hidden or directional control characters.' }
  }
  if ([...display].length > maximumLength) {
    return { valid: false, display, normalized, reason: `Topic names must be ${maximumLength} characters or fewer.` }
  }
  if (!/[\p{L}\p{N}]/u.test(normalized)) {
    return { valid: false, display, normalized, reason: 'A topic name needs at least one letter or number.' }
  }
  if (/\bhttps?:\/\//iu.test(display) || /\bwww\./iu.test(display)) {
    return { valid: false, display, normalized, reason: 'Enter a topic name, not a URL.' }
  }
  if (/\b[^\s@]+@[^\s@]+\.[^\s@]+\b/u.test(display)) {
    return { valid: false, display, normalized, reason: 'A topic name cannot contain an email address.' }
  }
  return { valid: true, display, normalized }
}
