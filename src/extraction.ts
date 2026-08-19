// Cold-start topic extraction from free text: n-gram phrases are compared
// against a snapshot's canonical names, slugs, and aliases using the durable
// normalizer. Exact-key matching only — extraction proposes, it never
// hallucinates. Fuzzy resolution belongs to interactive matching, where a
// person confirms the result.
import type { TopicConcept, TopicSnapshot } from './navigator.js'
import { normalizeTopicLabel } from './normalization.js'
import { seedAliasIndex, type SeedConcept } from './seed.js'

export type ExtractedTopic = {
  concept: TopicConcept
  occurrences: number
  matches: string[]
}

export type ExtractionOptions = {
  /** Extra label→slug aliases beyond concept names and slugs. */
  aliases?: ReadonlyMap<string, string>
  /** Longest phrase, in tokens, considered as one label. Default 4. */
  maxPhraseTokens?: number
  limit?: number
}

/** Index a snapshot's labels for extraction; pair with seedAliasIndex for seeds. */
export function snapshotLabelIndex(snapshot: TopicSnapshot): Map<string, string> {
  const index = new Map<string, string>()
  for (const concept of snapshot.concepts) {
    for (const label of [concept.name, concept.slug]) {
      const key = normalizeTopicLabel(label)
      if (key && !index.has(key)) index.set(key, concept.id)
    }
  }
  return index
}

export function extractTopicsFromText(
  text: string,
  snapshot: TopicSnapshot,
  options: ExtractionOptions = {},
): ExtractedTopic[] {
  const byId = new Map(snapshot.concepts.map((concept) => [concept.id, concept]))
  const index = snapshotLabelIndex(snapshot)
  for (const [key, slug] of options.aliases ?? []) {
    if (!index.has(key) && byId.has(slug)) index.set(key, slug)
  }
  const maxTokens = Math.max(1, Math.min(options.maxPhraseTokens ?? 4, 8))
  const tokens = normalizeTopicLabel(text).split(' ').filter(Boolean)
  const found = new Map<string, { occurrences: number, matches: Set<string> }>()
  // Longest-match-first per position so "machine learning" never double
  // counts as "machine" plus "learning".
  let position = 0
  while (position < tokens.length) {
    let advanced = 1
    for (let length = Math.min(maxTokens, tokens.length - position); length >= 1; length -= 1) {
      const phrase = tokens.slice(position, position + length).join(' ')
      const slug = index.get(phrase)
      if (!slug) continue
      const entry = found.get(slug) ?? { occurrences: 0, matches: new Set<string>() }
      entry.occurrences += 1
      entry.matches.add(phrase)
      found.set(slug, entry)
      advanced = length
      break
    }
    position += advanced
  }
  const results = [...found.entries()].flatMap(([slug, entry]) => {
    const concept = byId.get(slug)
    return concept ? [{ concept, occurrences: entry.occurrences, matches: [...entry.matches] }] : []
  }).sort((left, right) =>
    right.occurrences - left.occurrences || left.concept.name.localeCompare(right.concept.name))
  return results.slice(0, Math.max(1, options.limit ?? 20))
}

/** Convenience: extraction over the built-in seed with its aliases applied. */
export function extractSeedTopics(
  text: string,
  snapshot: TopicSnapshot,
  seed?: readonly SeedConcept[],
  options: ExtractionOptions = {},
): ExtractedTopic[] {
  return extractTopicsFromText(text, snapshot, { ...options, aliases: options.aliases ?? seedAliasIndex(seed) })
}
