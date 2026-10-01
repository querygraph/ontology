import type { TopicConcept, TopicSnapshot } from './navigator.js'

/** Application-owned suggestion language, keyed by canonical concept slug. */
export type ConceptLanguageModel = {
  /** Snapshot version this reviewed language was written against. */
  ontologyVersionId: string
  /** Optional application revision for the representative corpus. */
  version?: string
  representatives: Readonly<Record<string, string>>
}

export type ConceptTextMatch = {
  concept: TopicConcept
  score: number
}

export type ConceptTextIndex = {
  similarities(query: string): number[]
  search(query: string, limit?: number): ConceptTextMatch[]
}

const STOPWORDS = new Set([
  // Function words and boilerplate should not create a direction of their own.
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'being', 'but', 'by',
  'can', 'could', 'did', 'do', 'does', 'done', 'for', 'from', 'get', 'got',
  'had', 'has', 'have', 'he', 'her', 'here', 'hers', 'him', 'his', 'how', 'i',
  'if', 'in', 'into', 'is', 'it', 'its', 'just', 'made', 'make', 'may', 'me',
  'might', 'more', 'most', 'much', 'must', 'my', 'not', 'now', 'of', 'on',
  'only', 'or', 'other', 'our', 'ours', 'out', 'over', 'said', 'say', 'she',
  'should', 'some', 'still', 'such', 'than', 'that', 'the', 'their', 'them',
  'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too',
  'under', 'up', 'us', 'very', 'was', 'we', 'well', 'were', 'what', 'when',
  'where', 'which', 'while', 'who', 'why', 'will', 'with', 'without', 'would',
  'you', 'your', 'yours',
])

/**
 * TF-IDF suggestions over concept descriptions and optional representative
 * language. Rows and queries use log-TF, smoothed IDF, stopword removal, light
 * stemming, and L2 normalization. Representative text is never an exact alias
 * or extraction key; a person must confirm every semantic suggestion.
 *
 * A model applies only to its declared snapshot version. Each call builds an
 * independent index, so two applications can use different models over the
 * same immutable snapshot without leaking representative language.
 */
export function createConceptTextIndex(
  snapshot: TopicSnapshot,
  model?: ConceptLanguageModel,
): ConceptTextIndex {
  const useRepresentatives = snapshot.versionId === model?.ontologyVersionId
  const documents = snapshot.concepts.map((concept) => conceptTokens(
    concept,
    useRepresentatives
      ? model?.representatives[concept.slug]
      : undefined,
  ))
  const documentFrequency = new Map<string, number>()
  for (const document of documents) {
    for (const token of new Set(document)) {
      documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1)
    }
  }
  const count = snapshot.concepts.length
  const idf = new Map([...documentFrequency].map(([token, frequency]) => [
    token,
    Math.log((count + 1) / (frequency + 1)) + 1,
  ]))
  const vectors = documents.map((document) => normalizedVector(document, idf))

  const similarities = (query: string): number[] => {
    const queryVector = normalizedVector(textTokens(query), idf)
    if (!queryVector.size) return vectors.map(() => 0)
    return vectors.map((vector) => dot(vector, queryVector))
  }
  const index: ConceptTextIndex = {
    similarities,
    search(query: string, limit = 12) {
      return similarities(query)
        .map((score, position) => ({ concept: snapshot.concepts[position]!, score }))
        .filter(({ score }) => score > 0)
        .sort((left, right) => right.score - left.score || left.concept.name.localeCompare(right.concept.name))
        .slice(0, Math.max(0, Math.floor(limit)))
    },
  }
  return index
}

function conceptTokens(concept: TopicConcept, representatives?: string): string[] {
  return textTokens(`${concept.slug} ${concept.name} ${concept.summary} ${representatives ?? ''}`)
}

function textTokens(value: string): string[] {
  return value.toLowerCase().match(/[\p{L}\p{N}]+/gu)
    ?.filter((token) => token.length > 1 && !STOPWORDS.has(token))
    .map(stem) ?? []
}

/** Small deterministic stemmer; representative rows pass through the same
 * function, so ordinary inflections meet without changing durable labels. */
function stem(value: string): string {
  let token = value
  if (token.length > 5 && token.endsWith('ies')) token = `${token.slice(0, -3)}y`
  else if (token.length > 5 && token.endsWith('ing')) token = token.slice(0, -3)
  else if (token.length > 4 && token.endsWith('ed')) token = token.slice(0, -2)
  else if (token.length > 4 && /(ches|shes|xes|zes|sses)$/.test(token)) token = token.slice(0, -2)
  else if (token.length > 3 && token.endsWith('s') && !/(ss|us|is|ws)$/.test(token)) token = token.slice(0, -1)
  if (token.length > 3 && /([b-df-hj-np-tv-z])\1$/.test(token)) token = token.slice(0, -1)
  // Conflate a retained or restored silent e with inflected forms:
  // charge/charged, price/priced/pricing, and service/services.
  if (token.length > 4 && token.endsWith('e')) token = token.slice(0, -1)
  return token
}

function normalizedVector(values: string[], idf: Map<string, number>): Map<string, number> {
  const counts = new Map<string, number>()
  for (const token of values) {
    if (idf.has(token)) counts.set(token, (counts.get(token) ?? 0) + 1)
  }
  const vector = new Map<string, number>()
  let squaredNorm = 0
  for (const [token, count] of counts) {
    const weight = (1 + Math.log(count)) * (idf.get(token) ?? 0)
    vector.set(token, weight)
    squaredNorm += weight * weight
  }
  if (!squaredNorm) return vector
  const norm = Math.sqrt(squaredNorm)
  for (const [token, weight] of vector) vector.set(token, weight / norm)
  return vector
}

function dot(left: Map<string, number>, right: Map<string, number>): number {
  const [small, large] = left.size <= right.size ? [left, right] : [right, left]
  let value = 0
  for (const [token, weight] of small) value += weight * (large.get(token) ?? 0)
  return value
}
