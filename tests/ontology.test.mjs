import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  buildSeedSnapshot,
  extractSeedTopics,
  localTopicSearch,
  matchTopics,
  normalizeTopicLabel,
  SEED_CONCEPTS,
  seedAliasIndex,
  topicNavigatorBands,
  topicPrimaryTrail,
} from '../dist/index.js'

test('normalization keeps meaningful developer punctuation distinct', () => {
  const keys = ['C', 'C++', 'C#', '.NET', 'Node.js', 'CI/CD'].map(normalizeTopicLabel)
  assert.equal(new Set(keys).size, keys.length)
  assert.equal(normalizeTopicLabel('  Machine   Learning '), 'machine learning')
})

test('seed builds a valid three-tier snapshot', () => {
  const snapshot = buildSeedSnapshot()
  assert.ok(snapshot.concepts.length >= 80)
  for (const concept of snapshot.concepts) {
    if (concept.level === 'area') assert.equal(concept.parentIds.length, 0, `${concept.slug} is an area with parents`)
    else assert.ok(concept.parentIds.length > 0, `${concept.slug} has no parents`)
    assert.equal(concept.primaryPath.at(-1), concept.id)
  }
  const slugs = new Set(snapshot.concepts.map((concept) => concept.slug))
  assert.equal(slugs.size, snapshot.concepts.length, 'duplicate seed slugs')
})

test('the navigator shows three tiers for python', () => {
  const snapshot = buildSeedSnapshot()
  const trail = topicPrimaryTrail(snapshot, 'python')
  assert.deepEqual(trail.map((concept) => concept.slug), ['technology', 'programming-languages', 'python'])
  const bands = topicNavigatorBands(snapshot, 'python')
  assert.ok(bands.area.some((concept) => concept.slug === 'technology'))
  assert.ok(bands.focus.some((concept) => concept.slug === 'programming-languages'))
  assert.ok(bands.topic.some((concept) => concept.slug === 'javascript'), 'peers visible beside python')
})

test('matching reuses exact python and only suggests for typos', () => {
  const snapshot = buildSeedSnapshot()
  const matchable = snapshot.concepts.map((concept) => ({
    id: concept.id,
    label: concept.name,
    ancestorIds: concept.primaryPath.slice(0, -1),
  }))
  const exact = matchTopics('Python', matchable)
  assert.equal(exact.decision, 'reuse')
  assert.equal(exact.reusableTopicId, 'python')
  const partial = matchTopics('Pytho', matchable)
  assert.equal(partial.decision, 'suggest')
  assert.ok(partial.candidates.some((candidate) => candidate.topic.id === 'python'))
  // Transposition typos deliberately fall below the fuzzy threshold: the
  // matcher never guesses, it proposes creating a new topic instead.
  assert.equal(matchTopics('Pyhton', matchable).decision, 'new')
})

test('local search finds specific topics before broad ones', () => {
  const snapshot = buildSeedSnapshot()
  const { results } = localTopicSearch(snapshot, 'python')
  assert.equal(results[0]?.slug, 'python')
})

test('extraction pulls seeded topics out of text', () => {
  const snapshot = buildSeedSnapshot()
  const text = 'Python and machine learning ruined my feed: it is all AI slop and LLM demos now. Even the group chats agree.'
  const extracted = extractSeedTopics(text, snapshot)
  const slugs = extracted.map((entry) => entry.concept.slug)
  assert.ok(slugs.includes('python'))
  assert.ok(slugs.includes('machine-learning'))
  assert.ok(slugs.includes('ai-slop'))
  assert.ok(slugs.includes('llms'), 'alias llm resolves')
  assert.ok(slugs.includes('group-chats'))
})

test('alias index resolves shorthand to slugs', () => {
  const aliases = seedAliasIndex(SEED_CONCEPTS)
  assert.equal(aliases.get(normalizeTopicLabel('golang')), 'go-language')
  assert.equal(aliases.get(normalizeTopicLabel('rap')), 'hip-hop')
})

test('the reference chooser adapter passes conformance', async () => {
  const { referenceChooserAdapter, runChooserConformance } = await import('../dist/conformance.js')
  assert.deepEqual(runChooserConformance(referenceChooserAdapter()), [])
})
