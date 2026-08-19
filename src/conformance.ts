// Chooser-skin conformance: every UI over the navigator (Verdun's Vue
// composable, disappointed's vanilla gauge, DevReal's React bands) must
// replay this scripted scenario with byte-identical outcomes. The runner
// derives expected values from the engine itself, so a skin that re-derives
// selection logic locally — instead of delegating — fails loudly; a handful
// of golden assertions additionally pin engine behavior across versions.
import {
  localTopicSearch,
  topicBandActiveIds,
  topicNavigatorBands,
  topicRouteActiveId,
  topicRouteAfterChoice,
  topicNavigatorRoute,
  topicLevels,
  type TopicLevel,
  type TopicNavigatorRoute,
  type TopicSnapshot,
} from './navigator.js'
import { buildSeedSnapshot } from './seed.js'

/** The surface a chooser skin must expose to prove conformance. */
export type ChooserAdapter = {
  reset(snapshot: TopicSnapshot): void
  /** React to the user picking a concept (by id) in any band or search result. */
  choose(conceptId: string): void
  /** Current concept ids per band, in displayed order. */
  bands(): Record<TopicLevel, string[]>
  /** Highlighted concept id per band, if any. */
  activeIds(): Partial<Record<TopicLevel, string>>
  /** The concept the skin would act on (subscribe/nominate/select). */
  activeId(): string
  /** Search result concept ids, in displayed order. */
  search(query: string): string[]
}

export type ConformanceFailure = {
  step: string
  field: string
  expected: unknown
  actual: unknown
}

type Scenario = Array<
  | { kind: 'choose', id: string }
  | { kind: 'search', query: string }
  | { kind: 'golden', step: string, check: (route: TopicNavigatorRoute) => ConformanceFailure | null }
>

const scenario: Scenario = [
  { kind: 'choose', id: 'technology' },
  { kind: 'choose', id: 'programming-languages' },
  { kind: 'choose', id: 'python' },
  {
    kind: 'golden',
    step: 'python trail',
    check: (route) => {
      const expected = { areaId: 'technology', focusId: 'programming-languages', topicId: 'python' }
      return JSON.stringify(route) === JSON.stringify(expected)
        ? null
        : { step: 'python trail', field: 'route', expected, actual: route }
    },
  },
  // Cross-listing: a topic outside the selected focus must fall back to its
  // primary path rather than fabricate a nonexistent edge.
  { kind: 'choose', id: 'ai-slop' },
  {
    kind: 'golden',
    step: 'ai-slop primary path',
    check: (route) => route.focusId === 'artificial-intelligence'
      ? null
      : { step: 'ai-slop primary path', field: 'route.focusId', expected: 'artificial-intelligence', actual: route.focusId },
  },
  // Choosing an area resets the deeper tiers.
  { kind: 'choose', id: 'science' },
  { kind: 'choose', id: 'earth-climate' },
  { kind: 'choose', id: 'weather' },
  { kind: 'search', query: 'python' },
  { kind: 'search', query: 'brunch' },
  // A choice made from search must still land on a valid route.
  { kind: 'choose', id: 'brunch' },
]

export function runChooserConformance(
  adapter: ChooserAdapter,
  snapshot: TopicSnapshot = buildSeedSnapshot(),
): ConformanceFailure[] {
  const failures: ConformanceFailure[] = []
  let route: TopicNavigatorRoute = {}
  const byId = new Map(snapshot.concepts.map((concept) => [concept.id, concept]))

  adapter.reset(snapshot)
  compare('initial', adapter, route, snapshot, failures)

  for (const step of scenario) {
    if (step.kind === 'golden') {
      const failure = step.check(topicNavigatorRoute(snapshot, route))
      if (failure) failures.push(failure)
      continue
    }
    if (step.kind === 'search') {
      const expected = localTopicSearch(snapshot, step.query).results.map((concept) => concept.id)
      const actual = adapter.search(step.query)
      if (JSON.stringify(expected) !== JSON.stringify(actual)) {
        failures.push({ step: `search ${step.query}`, field: 'results', expected, actual })
      }
      continue
    }
    const concept = byId.get(step.id)
    if (!concept) {
      failures.push({ step: `choose ${step.id}`, field: 'scenario', expected: 'seed concept', actual: 'missing' })
      continue
    }
    route = topicRouteAfterChoice(snapshot, route, concept)
    adapter.choose(step.id)
    compare(`choose ${step.id}`, adapter, route, snapshot, failures)
  }
  return failures
}

function compare(
  step: string,
  adapter: ChooserAdapter,
  route: TopicNavigatorRoute,
  snapshot: TopicSnapshot,
  failures: ConformanceFailure[],
): void {
  const expectedBands = topicNavigatorBands(snapshot, route)
  const actualBands = adapter.bands()
  for (const level of topicLevels) {
    const expected = expectedBands[level].map((concept) => concept.id)
    const actual = actualBands[level] ?? []
    if (JSON.stringify(expected) !== JSON.stringify(actual)) {
      failures.push({ step, field: `bands.${level}`, expected, actual })
    }
  }
  const expectedActive = topicBandActiveIds(snapshot, route)
  const actualActive = adapter.activeIds()
  for (const level of topicLevels) {
    if ((expectedActive[level] ?? null) !== (actualActive[level] ?? null)) {
      failures.push({ step, field: `activeIds.${level}`, expected: expectedActive[level] ?? null, actual: actualActive[level] ?? null })
    }
  }
  const expectedId = topicRouteActiveId(topicNavigatorRoute(snapshot, route))
  if (expectedId !== adapter.activeId()) {
    failures.push({ step, field: 'activeId', expected: expectedId, actual: adapter.activeId() })
  }
}

/** The reference adapter: the engine wired to itself. Must always pass. */
export function referenceChooserAdapter(): ChooserAdapter {
  let snapshot: TopicSnapshot = buildSeedSnapshot()
  let route: TopicNavigatorRoute = {}
  return {
    reset(next) {
      snapshot = next
      route = {}
    },
    choose(conceptId) {
      const concept = snapshot.concepts.find((candidate) => candidate.id === conceptId)
      if (concept) route = topicRouteAfterChoice(snapshot, route, concept)
    },
    bands() {
      const bands = topicNavigatorBands(snapshot, route)
      return {
        area: bands.area.map((concept) => concept.id),
        focus: bands.focus.map((concept) => concept.id),
        topic: bands.topic.map((concept) => concept.id),
      }
    },
    activeIds() {
      return topicBandActiveIds(snapshot, route)
    },
    activeId() {
      return topicRouteActiveId(topicNavigatorRoute(snapshot, route))
    },
    search(query) {
      return localTopicSearch(snapshot, query).results.map((concept) => concept.id)
    },
  }
}
