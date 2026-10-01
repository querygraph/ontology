// Framework-neutral, multi-selection exploration over an immutable ontology
// snapshot. Every result is an interactive suggestion: only the caller can
// confirm a concept. Rendering and application-specific language stay outside
// this module, and exact matching/extraction retain their existing contracts.
import { extractTopicsFromText } from './extraction.js'
import { localTopicSearch, type TopicConcept, type TopicSnapshot } from './navigator.js'
import { normalizeTopicLabel } from './normalization.js'
import { buildSeedSnapshot, seedAliasIndex, SEED_VERSION } from './seed.js'
import { createConceptTextIndex, type ConceptTextIndex } from './concept-text.js'

export type OntologyExplorerOptions = {
  /** Optional application language model, built over this same snapshot. */
  textIndex?: ConceptTextIndex
  /** Approved labels mapped to canonical concept IDs; labels are normalized internally. */
  exactAliases?: ReadonlyMap<string, string>
}

export type OntologyRecommendation = {
  concept: TopicConcept
  /** Information gain in bits for recommendation rows; text relevance for textMatches. */
  score: number
}

export type OntologyRecommendations = {
  /** Ancestors of the current filing choice (the last selected concept). */
  general: OntologyRecommendation[]
  /** Descendants of the current filing choice (the last selected concept). */
  specific: OntologyRecommendation[]
  different: OntologyRecommendation[]
}

export type OntologyPosterior = {
  /** Shannon entropy of the current concept distribution, in bits. */
  entropy: number
  probabilities: Array<{ concept: TopicConcept, probability: number }>
}

export type OntologyExplorer = {
  selectedIds(): string[]
  selectedConcepts(): TopicConcept[]
  /** The most recently chosen concept; this is the filing choice when a form needs one value. */
  lastSelectedId(): string | null
  toggle(conceptId: string): void
  clear(): void
  /** Exact canonical/approved-alias, semantic representative-text, then fuzzy local matches. */
  textMatches(query: string, limit?: number): OntologyRecommendation[]
  posterior(query?: string): OntologyPosterior
  recommendations(query?: string, limit?: number): OntologyRecommendations
}

/**
 * Multi-selection exploration over the ontology DAG. This deliberately wraps
 * rather than changes the single-route navigator contract. Free text
 * supplies the prior over possible concepts. Every shelf choice is then a
 * positive Bayesian observation over that prior. Candidate chips are treated
 * as noisy yes/no questions, so the "different" row can greedily maximize
 * expected posterior entropy reduction while covering unexplored regions.
 */
export function createOntologyExplorer(
  snapshot: TopicSnapshot = buildSeedSnapshot(),
  options: OntologyExplorerOptions = {},
): OntologyExplorer {
  const byId = new Map(snapshot.concepts.map((concept) => [concept.id, concept]))
  const aliases = new Map<string, string>()
  // Seed aliases address slugs, whereas a consumer's canonical IDs may come
  // from its own store. Only a compatible seed view can inherit these labels.
  // An unrelated concept whose ID happens to equal a seed slug gains no alias.
  if (snapshot.versionId === `seed-v${SEED_VERSION}`) {
    const bySlug = new Map(snapshot.concepts.map((concept) => [concept.slug, concept]))
    for (const [label, slug] of seedAliasIndex()) {
      const concept = bySlug.get(slug)
      if (concept) aliases.set(label, concept.id)
    }
  }
  for (const [label, conceptId] of options.exactAliases ?? []) {
    const normalized = normalizeTopicLabel(label)
    if (normalized && byId.has(conceptId)) aliases.set(normalized, conceptId)
  }
  const textIndex = options.textIndex ?? createConceptTextIndex(snapshot)
  const posteriorSampleOrder = stablePosteriorSampleOrder(snapshot.concepts)
  const selectedLikelihoods = new Map<string, number[]>()
  const exactQuestionLikelihoods = snapshot.concepts.length <= ONTOLOGY_POSTERIOR_SAMPLE_LIMIT
  const selected: string[] = []

  const likelihoodsFor = (conceptId: string): number[] => {
    const cached = selectedLikelihoods.get(conceptId)
    if (cached) return cached
    const likelihoods = observationLikelihoodVector(conceptId, snapshot.concepts, byId)
    selectedLikelihoods.set(conceptId, likelihoods)
    return likelihoods
  }

  const related = (direction: 'parentIds' | 'childIds'): Set<string> => {
    // Shelf choices remain useful evidence, but the relation labels describe
    // the latest filing choice. Unioning all shelf closures can put Books in
    // both rows after choosing Arts & culture then Poetry, and call siblings
    // such as Play "more specific" than Poetry.
    const anchor = selected.at(-1)
    if (!anchor) return new Set()
    const distances = graphDistances(anchor, byId, (concept) => concept[direction])
    distances.delete(anchor)
    // Walk through selected ancestors too; rank excludes them from chips
    // without hiding the rest of their ancestry.
    return new Set(distances.keys())
  }

  const inferPosterior = (query: string): number[] => {
    const similarities = textIndex.similarities(query)
    const exactIds = new Set(extractTopicsFromText(query, snapshot, { aliases }).map(({ concept }) => concept.id))
    const logWeights = snapshot.concepts.map((concept, index) => {
      let logWeight = (similarities[index] ?? 0) * TEXT_EVIDENCE_STRENGTH
      if (exactIds.has(concept.id)) logWeight += EXACT_TEXT_EVIDENCE_STRENGTH
      for (const chosen of selected) {
        logWeight += Math.log(likelihoodsFor(chosen)[index] ?? MIN_OBSERVATION_LIKELIHOOD)
      }
      return logWeight
    })
    return softmax(logWeights)
  }

  const rank = (ids: Iterable<string>, posterior: number[], limit: number): OntologyRecommendation[] => {
    return candidateMetrics(
      ids,
      posterior,
      snapshot.concepts,
      byId,
      selected,
      posteriorSampleOrder,
      exactQuestionLikelihoods,
    )
      .sort(compareMetrics)
      .slice(0, Math.max(0, limit))
      .map(({ concept, informationGain }) => ({ concept, score: informationGain }))
  }

  /**
   * Greedy information coverage. Once a chip earns a slot, condition the
   * working posterior on the user saying "not that one" before finding the
   * next chip. The row therefore spans distinct posterior mass instead of
   * filling up with several near-equivalent questions.
   */
  const rankDifferent = (ids: Iterable<string>, posterior: number[], limit: number): OntologyRecommendation[] => {
    const remaining = new Set([...ids].filter((id) => byId.has(id) && !selected.includes(id)))
    const recommendations: OntologyRecommendation[] = []
    let uncovered = posterior
    while (remaining.size && recommendations.length < limit) {
      const metrics = candidateMetrics(
        remaining,
        uncovered,
        snapshot.concepts,
        byId,
        selected,
        posteriorSampleOrder,
        exactQuestionLikelihoods,
      )
      let best: CandidateMetric | undefined
      for (const metric of metrics) {
        if (!best || compareMetrics(metric, best) < 0) best = metric
      }
      if (!best) break
      recommendations.push({ concept: best.concept, score: best.informationGain })
      remaining.delete(best.concept.id)
      uncovered = posteriorAfterObservation(
        uncovered,
        observationLikelihoodVector(best.concept.id, snapshot.concepts, byId, exactQuestionLikelihoods),
        false,
      )
    }
    return recommendations
  }

  return {
    selectedIds: () => [...selected],
    selectedConcepts: () => selected.flatMap((id) => byId.get(id) ?? []),
    lastSelectedId: () => selected.at(-1) ?? null,
    toggle(conceptId: string) {
      if (!byId.has(conceptId)) return
      const at = selected.indexOf(conceptId)
      if (at >= 0) {
        selected.splice(at, 1)
        selectedLikelihoods.delete(conceptId)
      }
      else selected.push(conceptId)
    },
    clear() {
      selected.splice(0)
      selectedLikelihoods.clear()
    },
    textMatches(query: string, limit = 12) {
      const boundedLimit = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 0
      if (!query.trim() || !boundedLimit) return []
      const semanticMatches = textIndex.search(query, boundedLimit * 2)
      const semantic = new Map(semanticMatches
        .map(({ concept, score }) => [concept.id, score]))
      const local = localTopicSearch(snapshot, query, boundedLimit)
      const exactMatches = extractTopicsFromText(query, snapshot, { aliases }).map(({ concept }) => concept)
      const exactIds = new Set(exactMatches.map(({ id }) => id))
      const canonicalExact = local.exactMatchId ? byId.get(local.exactMatchId) : undefined
      const emitted = new Set<string>()
      const matches: OntologyRecommendation[] = []
      for (const concept of [
        ...exactMatches,
        ...(canonicalExact ? [canonicalExact] : []),
        ...semanticMatches.map(({ concept }) => concept),
        ...local.results,
      ]) {
        if (emitted.has(concept.id)) continue
        emitted.add(concept.id)
        matches.push({
          concept,
          score: exactIds.has(concept.id) || concept.id === canonicalExact?.id
            ? 1
            : semantic.get(concept.id) ?? 0,
        })
        if (matches.length >= boundedLimit) break
      }
      return matches
    },
    posterior(query = '') {
      const probabilities = inferPosterior(query)
      return {
        entropy: distributionEntropy(probabilities),
        probabilities: snapshot.concepts.map((concept, index) => ({ concept, probability: probabilities[index] }))
          .sort((left, right) => right.probability - left.probability || left.concept.name.localeCompare(right.concept.name)),
      }
    },
    recommendations(query = '', limit = 8) {
      const boundedLimit = Math.min(
        24,
        limit === Infinity
          ? snapshot.concepts.length
          : Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 0,
      )
      const posterior = inferPosterior(query)
      const ancestors = related('parentIds')
      const descendants = related('childIds')
      const excluded = new Set([...selected, ...ancestors, ...descendants])
      const alternatives = snapshot.concepts.filter((concept) => !excluded.has(concept.id)).map((concept) => concept.id)
      return {
        general: rank(ancestors, posterior, boundedLimit),
        specific: rank(descendants, posterior, boundedLimit),
        different: rankDifferent(alternatives, posterior, boundedLimit),
      }
    },
  }
}

const MIN_OBSERVATION_LIKELIHOOD = 0.025
const TEXT_EVIDENCE_STRENGTH = 8
const EXACT_TEXT_EVIDENCE_STRENGTH = 10
export const ONTOLOGY_POSTERIOR_SAMPLE_LIMIT = 192

type CandidateMetric = {
  concept: TopicConcept
  informationGain: number
  yesProbability: number
}

/**
 * P(the person chooses candidate | their latent concept). A concept is strong
 * evidence for itself and its descendants, useful evidence for an ancestor,
 * and weak-but-nonzero evidence for nearby cross-listed concepts. Keeping the
 * likelihoods away from zero also lets a later click correct an earlier one.
 * This vector is created only for an actual shelf choice or a selected greedy
 * question; there is no permanent concept-by-concept matrix.
 */
function observationLikelihoodVector(
  candidateId: string,
  concepts: readonly TopicConcept[],
  byId: Map<string, TopicConcept>,
  includeNearby = true,
): number[] {
  const likelihoods = observationLikelihoodsAround(candidateId, byId, 'candidate', includeNearby)
  return concepts.map((hypothesis) => likelihoods.get(hypothesis.id) ?? MIN_OBSERVATION_LIKELIHOOD)
}

type ObservationAnchorRole = 'candidate' | 'hypothesis'

/**
 * The one likelihood kernel used in both orientations of the EIG calculation.
 * With a candidate anchor the returned keys are latent hypotheses; with a
 * hypothesis anchor they are candidate questions. The direction swap is just
 * a sparse transpose of the same P(candidate click | latent concept) matrix.
 * Large-graph question ranking can omit only the symmetric weak-neighbor
 * term via includeNearby; all retained relationship values still come from
 * this definition.
 */
function observationLikelihoodsAround(
  anchorId: string,
  byId: Map<string, TopicConcept>,
  anchorRole: ObservationAnchorRole,
  includeNearby = true,
): Map<string, number> {
  const result = new Map<string, number>([[anchorId, 0.97]])
  const add = (distances: Map<string, number>, initial: number, decay: number): void => {
    for (const [id, distance] of distances) {
      if (!distance) continue
      const likelihood = decayedLikelihood(initial, decay, distance)
      if (likelihood <= MIN_OBSERVATION_LIKELIHOOD) continue
      result.set(id, Math.max(result.get(id) ?? MIN_OBSERVATION_LIKELIHOOD, likelihood))
    }
  }

  // A candidate is strong evidence for hypotheses below it, and useful
  // evidence for hypotheses above it. Reversing the anchor transposes those
  // two graph walks without changing the likelihood definition.
  add(graphDistances(
    anchorId,
    byId,
    anchorRole === 'candidate' ? (concept) => concept.childIds : (concept) => concept.parentIds,
  ), 0.90, 0.82)
  add(graphDistances(
    anchorId,
    byId,
    anchorRole === 'candidate' ? (concept) => concept.parentIds : (concept) => concept.childIds,
  ), 0.72, 0.82)

  // Cross-listed and sibling concepts help a later click correct an earlier
  // one. The undirected kernel is symmetric, so its transpose is identical.
  if (includeNearby) {
    add(graphDistances(
      anchorId,
      byId,
      (concept) => [...concept.parentIds, ...concept.childIds],
      4,
    ), 0.16, 0.55)
  }
  return result
}

function graphDistances(
  startId: string,
  byId: Map<string, TopicConcept>,
  adjacent: (concept: TopicConcept) => string[],
  maximumDistance = Number.POSITIVE_INFINITY,
): Map<string, number> {
  const distances = new Map<string, number>([[startId, 0]])
  const queue = [startId]
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const id = queue[cursor]
    const concept = byId.get(id)
    if (!concept) continue
    const distance = distances.get(id) ?? 0
    if (distance >= maximumDistance) continue
    for (const next of adjacent(concept)) {
      if (!byId.has(next) || distances.has(next)) continue
      distances.set(next, distance + 1)
      queue.push(next)
    }
  }
  return distances
}

function decayedLikelihood(initial: number, decay: number, distance: number): number {
  return Math.max(MIN_OBSERVATION_LIKELIHOOD, initial * Math.pow(decay, distance - 1))
}

/**
 * Expected information gain without an N×N likelihood table. For a small
 * ontology this is exact. For a larger graph, deterministic posterior
 * quantiles represent at most 192 latent concepts. Each sampled hypothesis
 * contributes only to its ancestor/descendant closure; weak sibling evidence
 * stays at the conservative background floor for ranking purposes.
 */
function candidateMetrics(
  ids: Iterable<string>,
  posterior: number[],
  concepts: readonly TopicConcept[],
  byId: Map<string, TopicConcept>,
  selected: string[],
  sampleOrder: number[],
  includeNearby: boolean,
): CandidateMetric[] {
  const selectedIds = new Set(selected)
  const candidates = [...new Set(ids)].flatMap((id) => {
    const concept = byId.get(id)
    return concept && !selectedIds.has(id) ? [concept] : []
  })
  if (!candidates.length) return []

  const backgroundEntropy = binaryEntropy(MIN_OBSERVATION_LIKELIHOOD)
  const accumulated = new Map(candidates.map((concept) => [concept.id, {
    yesProbability: MIN_OBSERVATION_LIKELIHOOD,
    conditionalEntropy: backgroundEntropy,
  }]))
  for (const hypothesis of samplePosterior(posterior, sampleOrder)) {
    const hypothesisConcept = concepts[hypothesis.index]
    if (!hypothesisConcept) continue
    const related = observationLikelihoodsAround(hypothesisConcept.id, byId, 'hypothesis', includeNearby)
    for (const [candidateId, likelihood] of related) {
      const value = accumulated.get(candidateId)
      if (!value) continue
      value.yesProbability += hypothesis.probability * (likelihood - MIN_OBSERVATION_LIKELIHOOD)
      value.conditionalEntropy += hypothesis.probability
        * (binaryEntropy(likelihood) - backgroundEntropy)
    }
  }
  return candidates.map((concept) => {
    const value = accumulated.get(concept.id)!
    return {
      concept,
      yesProbability: value.yesProbability,
      informationGain: Math.max(0, binaryEntropy(value.yesProbability) - value.conditionalEntropy),
    }
  })
}

type SampledHypothesis = { index: number, probability: number }

function samplePosterior(posterior: number[], stableOrder: number[]): SampledHypothesis[] {
  if (posterior.length <= ONTOLOGY_POSTERIOR_SAMPLE_LIMIT) {
    return posterior.flatMap((probability, index) => probability > 0 ? [{ index, probability }] : [])
  }
  // Midpoint quantiles give a deterministic, bounded approximation and
  // naturally repeat/aggregate a concept when the text prior is concentrated.
  // Traverse concepts in a stable hash order: snapshot arrays carry no
  // topological-order contract, and sampling in input order can otherwise
  // alias perfectly with a branch and miss half of a diffuse posterior.
  const counts = new Map<number, number>()
  let cursor = 0
  let cumulative = posterior[stableOrder[0] ?? 0] ?? 0
  for (let sample = 0; sample < ONTOLOGY_POSTERIOR_SAMPLE_LIMIT; sample += 1) {
    const quantile = (sample + 0.5) / ONTOLOGY_POSTERIOR_SAMPLE_LIMIT
    while (cursor < stableOrder.length - 1 && cumulative < quantile) {
      cursor += 1
      cumulative += posterior[stableOrder[cursor] ?? 0] ?? 0
    }
    const index = stableOrder[cursor] ?? 0
    counts.set(index, (counts.get(index) ?? 0) + 1)
  }
  return [...counts].map(([index, count]) => ({
    index,
    probability: count / ONTOLOGY_POSTERIOR_SAMPLE_LIMIT,
  }))
}

function stablePosteriorSampleOrder(concepts: readonly TopicConcept[]): number[] {
  return concepts.map((concept, index) => ({ id: concept.id, hash: stableHash(concept.id), index }))
    .sort((left, right) => left.hash - right.hash || left.id.localeCompare(right.id))
    .map(({ index }) => index)
}

/** FNV-1a followed by an integer avalanche; deterministic in every JS host. */
function stableHash(value: string): number {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 0x01000193)
  }
  hash ^= hash >>> 16
  hash = Math.imul(hash, 0x7feb352d)
  hash ^= hash >>> 15
  hash = Math.imul(hash, 0x846ca68b)
  hash ^= hash >>> 16
  return hash >>> 0
}

function compareMetrics(left: CandidateMetric, right: CandidateMetric): number {
  return right.informationGain - left.informationGain
    || Math.abs(0.5 - left.yesProbability) - Math.abs(0.5 - right.yesProbability)
    || left.concept.name.localeCompare(right.concept.name)
    || left.concept.id.localeCompare(right.concept.id)
}

function binaryEntropy(probability: number): number {
  const inverse = 1 - probability
  return -(probability ? probability * Math.log2(probability) : 0)
    - (inverse ? inverse * Math.log2(inverse) : 0)
}

function posteriorAfterObservation(posterior: number[], likelihoods: number[], observed: boolean): number[] {
  const weights = posterior.map((probability, index) => probability * (observed ? likelihoods[index] : 1 - likelihoods[index]))
  return normalize(weights)
}

function distributionEntropy(probabilities: number[]): number {
  const entropy = -probabilities.reduce((sum, probability) => sum + (probability ? probability * Math.log2(probability) : 0), 0)
  return entropy || 0
}

function softmax(logWeights: number[]): number[] {
  if (!logWeights.length) return []
  const maximum = Math.max(...logWeights)
  return normalize(logWeights.map((weight) => Math.exp(weight - maximum)))
}

function normalize(weights: number[]): number[] {
  const total = weights.reduce((sum, weight) => sum + weight, 0)
  return total ? weights.map((weight) => weight / total) : weights.map(() => 1 / Math.max(1, weights.length))
}
