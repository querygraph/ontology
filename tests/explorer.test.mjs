import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  buildSeedSnapshot,
  createConceptTextIndex,
  createOntologyExplorer,
  extractSeedTopics,
  ONTOLOGY_POSTERIOR_SAMPLE_LIMIT,
} from '../dist/index.js'

// These test the public engine contract independently of any application's
// personal vocabulary, filtered view, DOM renderer, or persisted data.

test('multi-selection explorer keeps a shelf and exposes the DAG in both directions', () => {
  const snapshot = buildSeedSnapshot()
  const explorer = createOntologyExplorer(snapshot)
  const food = snapshot.concepts.find((concept) => concept.slug === 'food')
  const restaurants = snapshot.concepts.find((concept) => concept.slug === 'restaurants')
  assert.ok(food)
  assert.ok(restaurants)

  explorer.toggle(food.id)
  explorer.toggle(restaurants.id)
  assert.deepEqual(explorer.selectedIds(), [food.id, restaurants.id])
  assert.equal(explorer.lastSelectedId(), restaurants.id)

  explorer.toggle(food.id)
  const recommendations = explorer.recommendations('restaurant dinner with friends', 20)
  assert.ok(recommendations.general.length > 0)
  assert.ok(recommendations.specific.length > 0)
  assert.ok(recommendations.different.length > 0)
  assert.ok(recommendations.different.every(({ concept }) => !explorer.selectedIds().includes(concept.id)))

  assert.deepEqual(explorer.selectedIds(), [restaurants.id])
  assert.equal(explorer.lastSelectedId(), restaurants.id)
  explorer.toggle(restaurants.id)
  assert.equal(explorer.lastSelectedId(), null)
})

test('shared exact names and approved aliases lead both matches and the posterior', () => {
  const explorer = createOntologyExplorer(buildSeedSnapshot())
  for (const [query, expected] of [['AI', 'artificial-intelligence'], ['C++', 'cpp']]) {
    assert.equal(explorer.textMatches(query, 1)[0]?.concept.slug, expected, query)
    const posterior = explorer.posterior(query).probabilities
    assert.equal(posterior[0]?.concept.slug, expected, query)
    assert.ok(posterior[0]?.probability > 0.9, query)
  }
})

test('each composer choice stays selected while the DAG recommendations advance', () => {
  const snapshot = buildSeedSnapshot()
  const explorer = createOntologyExplorer(snapshot)
  const customerService = snapshot.concepts.find((concept) => concept.slug === 'customer-service')
  const everydayLife = snapshot.concepts.find((concept) => concept.slug === 'everyday-life')
  assert.ok(customerService)
  assert.ok(everydayLife)

  const before = explorer.recommendations('posted this', 20).different.map(({ concept }) => concept.id)
  explorer.toggle(customerService.id)
  const afterFirst = explorer.recommendations('posted this', 20)
  assert.deepEqual(explorer.selectedIds(), [customerService.id])
  assert.ok(afterFirst.general.some(({ concept }) => concept.id === everydayLife.id))
  assert.ok(!afterFirst.different.some(({ concept }) => concept.id === customerService.id))
  assert.notDeepEqual(afterFirst.different.map(({ concept }) => concept.id), before)

  explorer.toggle(everydayLife.id)
  assert.deepEqual(explorer.selectedIds(), [customerService.id, everydayLife.id])
  explorer.recommendations('posted this and then changed the wing text', 20)
  assert.deepEqual(explorer.selectedIds(), [customerService.id, everydayLife.id])

  explorer.toggle(everydayLife.id)
  assert.deepEqual(explorer.selectedIds(), [customerService.id])
})

test('shelf choices update an explicit posterior and the next questions', () => {
  const snapshot = balancedCalibrationSnapshot()
  const explorer = createOntologyExplorer(snapshot)
  const alphaBranch = new Set(['alpha', 'alpha-one', 'alpha-two', 'alpha-three', 'alpha-four'])
  const branchMass = (posterior, branch) => posterior.probabilities
    .filter(({ concept }) => branch.has(concept.id))
    .reduce((sum, { probability }) => sum + probability, 0)
  const probabilityOf = (posterior, id) => posterior.probabilities
    .find(({ concept }) => concept.id === id)?.probability ?? 0

  const before = explorer.posterior()
  const beforeQuestions = explorer.recommendations('', 10).different.map(({ concept }) => concept.id)
  explorer.toggle('alpha')
  const after = explorer.posterior()
  const afterQuestions = explorer.recommendations('', 10).different.map(({ concept }) => concept.id)

  assert.ok(branchMass(after, alphaBranch) > branchMass(before, alphaBranch) + 0.4)
  assert.ok(after.entropy < before.entropy)
  assert.notDeepEqual(afterQuestions, beforeQuestions)
  assert.equal(afterQuestions[0], 'beta')
  assert.ok(afterQuestions.every((id) => !alphaBranch.has(id)))

  explorer.toggle('alpha-one')
  const refined = explorer.posterior()
  assert.deepEqual(explorer.selectedIds(), ['alpha', 'alpha-one'])
  assert.ok(probabilityOf(refined, 'alpha-one') > probabilityOf(after, 'alpha-one'))
  assert.ok(refined.entropy < after.entropy)
})

test('maximum-information questions split posterior mass, then cover the other branch', () => {
  const explorer = createOntologyExplorer(balancedCalibrationSnapshot())
  const recommendations = explorer.recommendations('', 2).different
  const branch = (id) => id.startsWith('alpha') ? 'alpha' : 'beta'

  assert.ok(['alpha', 'beta'].includes(recommendations[0].concept.id))
  assert.ok(recommendations[0].score > 0.65)
  assert.notEqual(branch(recommendations[0].concept.id), branch(recommendations[1].concept.id))
})

test('information gain uses the same weak-neighbor likelihood as shelf observations', () => {
  const snapshot = siblingCalibrationSnapshot()
  const explorer = createOntologyExplorer(snapshot)
  explorer.toggle('root')
  const posterior = new Map(explorer.posterior().probabilities
    .map(({ concept, probability }) => [concept.id, probability]))
  const recommendation = explorer.recommendations('', 10).specific[0]
  assert.ok(recommendation)

  const candidateId = recommendation.concept.id
  const likelihoods = snapshot.concepts.map((concept) => concept.id === candidateId
    ? 0.97
    : concept.id === 'root'
      ? 0.72
      : 0.16 * 0.55)
  const probabilities = snapshot.concepts.map((concept) => posterior.get(concept.id) ?? 0)
  const yesProbability = probabilities.reduce((sum, probability, index) =>
    sum + probability * likelihoods[index], 0)
  const expectedConditionalEntropy = probabilities.reduce((sum, probability, index) =>
    sum + probability * binaryEntropy(likelihoods[index]), 0)
  const exactInformationGain = binaryEntropy(yesProbability) - expectedConditionalEntropy

  assert.ok(Math.abs(recommendation.score - exactInformationGain) < 1e-12)
})

test('posterior inference is stable for empty and singleton snapshots', () => {
  const empty = createOntologyExplorer({ versionId: 'empty', version: 1, concepts: [] })
  assert.deepEqual(empty.posterior('anything'), { entropy: 0, probabilities: [] })
  assert.deepEqual(empty.recommendations('anything'), { general: [], specific: [], different: [] })

  const singletonSnapshot = {
    versionId: 'singleton',
    version: 1,
    concepts: [{
      id: 'only', slug: 'only', name: 'Only', summary: 'The only concept.', level: 'area', selectable: true,
      parentIds: [], childIds: [], primaryPath: ['only'],
    }],
  }
  const singleton = createOntologyExplorer(singletonSnapshot)
  assert.deepEqual(singleton.posterior().probabilities.map(({ concept, probability }) => [concept.id, probability]), [['only', 1]])
  assert.equal(singleton.posterior().entropy, 0)
  assert.deepEqual(singleton.recommendations('', 0.5), { general: [], specific: [], different: [] })
  assert.deepEqual(singleton.recommendations('', 1).different.map(({ concept, score }) => [concept.id, score]), [['only', 0]])
})

test('large DAG recommendation uses a bounded posterior sample without a dense likelihood matrix', () => {
  assert.ok(ONTOLOGY_POSTERIOR_SAMPLE_LIMIT <= 256)
  const explorer = createOntologyExplorer(wideCalibrationSnapshot(2_500))
  const recommendations = explorer.recommendations('concept 1277 reliability', 10)
  assert.equal(recommendations.different.length, 10)
  assert.equal(explorer.textMatches('concept 1277 reliability', 1)[0]?.concept.id, 'concept-1277')
  assert.equal(explorer.posterior('concept 1277 reliability').probabilities[0]?.concept.id, 'concept-1277')
})

test('large-DAG sampling is order-independent and does not alias with a balanced branch', () => {
  const snapshot = adversarialSamplingSnapshot(2_500)
  const forward = createOntologyExplorer(snapshot).recommendations('posted this', 10).different
  const reversed = createOntologyExplorer({
    ...snapshot,
    concepts: [...snapshot.concepts].reverse(),
  }).recommendations('posted this', 10).different

  assert.ok(['left-root', 'right-root'].includes(forward[0]?.concept.id))
  assert.ok(forward[0].score > 0.6)
  assert.deepEqual(
    forward.map(({ concept }) => concept.id),
    reversed.map(({ concept }) => concept.id),
  )
})

function siblingCalibrationSnapshot() {
  const concept = (id, level, parentIds = [], childIds = []) => ({
    id,
    slug: id,
    name: id,
    summary: '',
    level,
    selectable: true,
    parentIds,
    childIds,
    primaryPath: parentIds.length ? [parentIds[0], id] : [id],
  })
  const children = ['alpha', 'beta', 'gamma']
  return {
    versionId: 'sibling-calibration',
    version: 1,
    concepts: [
      concept('root', 'area', [], children),
      ...children.map((id) => concept(id, 'topic', ['root'])),
    ],
  }
}

function adversarialSamplingSnapshot(size) {
  const sampleLimit = ONTOLOGY_POSTERIOR_SAMPLE_LIMIT
  const sampledInputPositions = new Set(Array.from({ length: sampleLimit }, (_, index) =>
    Math.ceil(((index + 0.5) / sampleLimit) * size) - 1))
  const leftPositions = new Set(Array.from({ length: size }, (_, index) => index)
    .filter((index) => index >= 2 && !sampledInputPositions.has(index))
    .slice(0, Math.floor(size / 2) - 1))
  const concepts = Array.from({ length: size }, (_, index) => {
    const id = index === 0 ? 'left-root' : index === 1 ? 'right-root' : `leaf-${index}`
    const parentId = leftPositions.has(index) ? 'left-root' : 'right-root'
    return {
      id,
      slug: id,
      name: id,
      summary: '',
      level: index < 2 ? 'area' : 'topic',
      selectable: true,
      parentIds: index < 2 ? [] : [parentId],
      childIds: [],
      primaryPath: index < 2 ? [id] : [parentId, id],
    }
  })
  const byId = new Map(concepts.map((concept) => [concept.id, concept]))
  for (const concept of concepts) {
    for (const parentId of concept.parentIds) byId.get(parentId)?.childIds.push(concept.id)
  }
  return { versionId: 'adversarial-sampling', version: 1, concepts }
}

function binaryEntropy(probability) {
  const inverse = 1 - probability
  return -(probability ? probability * Math.log2(probability) : 0)
    - (inverse ? inverse * Math.log2(inverse) : 0)
}

function balancedCalibrationSnapshot() {
  const concept = (id, level, parentIds = [], childIds = []) => ({
    id,
    slug: id,
    name: id,
    summary: id,
    level,
    selectable: true,
    parentIds,
    childIds,
    primaryPath: parentIds.length ? [parentIds[0], id] : [id],
  })
  const alphaChildren = ['alpha-one', 'alpha-two', 'alpha-three', 'alpha-four']
  const betaChildren = ['beta-one', 'beta-two', 'beta-three', 'beta-four']
  return {
    versionId: 'balanced-calibration',
    version: 1,
    concepts: [
      concept('alpha', 'area', [], alphaChildren),
      concept('beta', 'area', [], betaChildren),
      ...alphaChildren.map((id) => concept(id, 'topic', ['alpha'])),
      ...betaChildren.map((id) => concept(id, 'topic', ['beta'])),
    ],
  }
}

function wideCalibrationSnapshot(size) {
  const roots = 10
  const focuses = 100
  const concepts = Array.from({ length: size }, (_, index) => {
    const level = index < roots ? 'area' : index < roots + focuses ? 'focus' : 'topic'
    const parentIds = level === 'focus'
      ? [`concept-${index % roots}`]
      : level === 'topic'
        ? [`concept-${roots + (index % focuses)}`]
        : []
    return {
      id: `concept-${index}`,
      slug: `concept-${index}`,
      name: `Concept ${index}`,
      summary: index === 1277 ? 'Reliability target.' : `Synthetic calibration node ${index}.`,
      level,
      selectable: true,
      parentIds,
      childIds: [],
      primaryPath: [],
    }
  })
  const byId = new Map(concepts.map((concept) => [concept.id, concept]))
  for (const concept of concepts) {
    for (const parentId of concept.parentIds) byId.get(parentId)?.childIds.push(concept.id)
  }
  for (const concept of concepts) {
    const path = [concept.id]
    let cursor = concept
    while (cursor.parentIds[0]) {
      cursor = byId.get(cursor.parentIds[0])
      path.unshift(cursor.id)
    }
    concept.primaryPath = path
  }
  return { versionId: 'synthetic-wide', version: 1, concepts }
}

test('relationship rows follow the latest selection and retain ancestry through selected parents', () => {
  const explorer = createOntologyExplorer(buildSeedSnapshot())
  explorer.toggle('culture')
  explorer.toggle('writing')
  explorer.toggle('poetry')
  for (const query of ['writing poetry by hand', 'play with books', '']) {
    const recommendations = explorer.recommendations(query, 24)
    assert.deepEqual(new Set(recommendations.general.map(({ concept }) => concept.slug)),
      new Set(['books', 'everyday-life']))
    assert.deepEqual(recommendations.specific, [], 'a leaf does not inherit earlier selections’ descendants')
    const ids = Object.values(recommendations).flat().map(({ concept }) => concept.id)
    assert.equal(new Set(ids).size, ids.length, 'relationship rows do not repeat a concept')
    assert.ok(!ids.includes('poetry'))
  }
  assert.deepEqual(explorer.selectedIds(), ['culture', 'writing', 'poetry'])

  explorer.toggle('poetry')
  assert.deepEqual(new Set(explorer.recommendations('', 24).specific.map(({ concept }) => concept.slug)),
    new Set(['poetry', 'journaling', 'letter-writing', 'storytelling']),
    'removing the final selection restores the previous anchor')

  explorer.clear()
  explorer.toggle('writing')
  explorer.toggle('poetry')
  assert.deepEqual(new Set(explorer.recommendations('', 24).general.map(({ concept }) => concept.slug)),
    new Set(['culture', 'everyday-life', 'books']))
})

test('a polyhierarchical leaf has no narrower concepts after exploring a broad area', () => {
  const explorer = createOntologyExplorer(buildSeedSnapshot())
  explorer.toggle('everyday-life')
  explorer.toggle('journaling')
  const recommendations = explorer.recommendations('personal diary', 24)
  assert.deepEqual(recommendations.specific, [])
  assert.deepEqual(new Set(recommendations.general.map(({ concept }) => concept.slug)),
    new Set(['writing', 'culture', 'reflection', 'health']))
  assert.ok(recommendations.different.every(({ concept }) =>
    !['everyday-life', 'journaling', 'writing', 'culture', 'reflection', 'health'].includes(concept.slug)))
})

test('explorers keep independent selection state and use canonical IDs rather than slugs', () => {
  const snapshot = textCalibrationSnapshot()
  const untouched = structuredClone(snapshot)
  const explorer = createOntologyExplorer(snapshot)
  const independent = createOntologyExplorer(snapshot)
  explorer.toggle('loom')
  explorer.toggle('missing')
  assert.deepEqual(explorer.selectedIds(), [], 'slugs and unknown IDs are not filing IDs')
  explorer.toggle('node-root')
  explorer.toggle('node-loom')
  assert.deepEqual(explorer.selectedIds(), ['node-root', 'node-loom'])
  assert.equal(explorer.lastSelectedId(), 'node-loom')
  assert.deepEqual(explorer.selectedConcepts().map(({ slug }) => slug), ['craftwork', 'loom'])
  assert.deepEqual(explorer.recommendations().specific, [])
  assert.deepEqual(independent.selectedIds(), [])
  const leaked = explorer.selectedIds()
  leaked.splice(0)
  assert.deepEqual(explorer.selectedIds(), ['node-root', 'node-loom'])
  explorer.clear()
  assert.equal(explorer.lastSelectedId(), null)
  assert.deepEqual(explorer.selectedConcepts(), [])
  assert.deepEqual(snapshot, untouched, 'the shared snapshot remains immutable')
})

test('representative models are opt-in, isolated per index, and ignored on version mismatch', () => {
  const snapshot = textCalibrationSnapshot()
  const model = { ontologyVersionId: snapshot.versionId, representatives: { loom: 'silken threads shuttle' } }
  const alternateModel = { ontologyVersionId: snapshot.versionId, representatives: { kiln: 'silken threads shuttle' } }
  const defaultIndex = createConceptTextIndex(snapshot)
  const loomIndex = createConceptTextIndex(snapshot, model)
  const kilnIndex = createConceptTextIndex(snapshot, alternateModel)
  const staleIndex = createConceptTextIndex(snapshot, { ...model, ontologyVersionId: 'stale-model' })
  assert.deepEqual(defaultIndex.search('silken threads'), [])
  assert.equal(loomIndex.search('silken threads', 1)[0]?.concept.id, 'node-loom')
  assert.equal(kilnIndex.search('silken threads', 1)[0]?.concept.id, 'node-kiln')
  assert.equal(loomIndex.search('silken threads', 1)[0]?.concept.id, 'node-loom', 'another model does not replace an index')
  assert.deepEqual(staleIndex.search('silken threads'), [])
  assert.equal(staleIndex.search('Loom', 1)[0]?.concept.id, 'node-loom', 'canonical descriptions remain searchable')
  assert.deepEqual(createConceptTextIndex(snapshot).search('silken threads'), [])
})

test('representative phrases rank suggestions and posterior without changing exact extraction or selections', () => {
  const snapshot = textCalibrationSnapshot()
  const textIndex = createConceptTextIndex(snapshot, {
    ontologyVersionId: snapshot.versionId,
    representatives: { loom: 'silken threads shuttle', kiln: 'bake bread bake pottery' },
  })
  const explorer = createOntologyExplorer(snapshot, { textIndex })
  assert.equal(explorer.textMatches('silken threads', 1)[0]?.concept.id, 'node-loom')
  assert.equal(explorer.posterior('silken threads').probabilities[0]?.concept.id, 'node-loom')
  assert.deepEqual(explorer.selectedIds(), [])
  assert.deepEqual(extractSeedTopics('silken threads', snapshot), [])
  assert.deepEqual(textIndex.search('baking the bread').map(({ concept }) => concept.id),
    textIndex.search('bake bread').map(({ concept }) => concept.id), 'token normalization is shared by descriptions and queries')
  assert.deepEqual(textIndex.search('this is what we did'), [])
  assert.deepEqual(textIndex.similarities('this is what we did'), [0, 0, 0])
})

test('exact canonical names and approved aliases outrank conflicting representative evidence', () => {
  const snapshot = buildSeedSnapshot()
  const explorer = createOntologyExplorer(snapshot, {
    textIndex: createConceptTextIndex(snapshot, {
      ontologyVersionId: snapshot.versionId,
      representatives: { poetry: 'AI AI AI AI AI C++ C++ C++ C++' },
    }),
  })
  for (const [query, expected] of [['AI', 'artificial-intelligence'], ['C++', 'cpp']]) {
    assert.equal(explorer.textMatches(query, 1)[0]?.concept.slug, expected, query)
    assert.equal(explorer.posterior(query).probabilities[0]?.concept.slug, expected, query)
  }
  assert.deepEqual(explorer.selectedIds(), [])
})

test('non-finite and fractional result limits remain bounded', () => {
  const snapshot = buildSeedSnapshot()
  const explorer = createOntologyExplorer(snapshot)
  const textIndex = createConceptTextIndex(snapshot)
  for (const limit of [-1, 0, 0.5, NaN, -Infinity]) {
    assert.deepEqual(explorer.textMatches('Writing', limit), [])
    assert.deepEqual(explorer.recommendations('Writing', limit), { general: [], specific: [], different: [] })
    assert.deepEqual(textIndex.search('Writing', limit), [])
  }
  assert.ok(explorer.textMatches('Writing', Infinity).length <= snapshot.concepts.length)
  assert.ok(Object.values(explorer.recommendations('Writing', Infinity)).every((row) => row.length <= 24))
  assert.ok(textIndex.search('Writing', Infinity).length <= snapshot.concepts.length)
  assert.equal(explorer.textMatches('Writing', 1.9).length, 1)
})

function textCalibrationSnapshot() {
  return {
    versionId: 'text-calibration',
    version: 1,
    concepts: [
      { id: 'node-root', slug: 'craftwork', name: 'Craftwork', summary: '', level: 'area', selectable: true,
        parentIds: [], childIds: ['node-loom', 'node-kiln'], primaryPath: ['node-root'] },
      { id: 'node-loom', slug: 'loom', name: 'Loom', summary: '', level: 'topic', selectable: true,
        parentIds: ['node-root'], childIds: [], primaryPath: ['node-root', 'node-loom'] },
      { id: 'node-kiln', slug: 'kiln', name: 'Kiln', summary: '', level: 'topic', selectable: true,
        parentIds: ['node-root'], childIds: [], primaryPath: ['node-root', 'node-kiln'] },
    ],
  }
}

test('generic concept IDs cannot inherit unrelated built-in seed aliases', () => {
  const snapshot = {
    versionId: 'custom-furniture',
    version: 1,
    concepts: [
      { id: 'cpp', slug: 'chair', name: 'Chair', summary: '', level: 'area', selectable: true,
        parentIds: [], childIds: [], primaryPath: ['cpp'] },
      { id: 'table-id', slug: 'table', name: 'Table', summary: '', level: 'area', selectable: true,
        parentIds: [], childIds: [], primaryPath: ['table-id'] },
    ],
  }
  const explorer = createOntologyExplorer(snapshot)
  assert.deepEqual(explorer.textMatches('C++'), [], 'a coincidentally matching ID is not a reviewed alias')
  assert.deepEqual(explorer.posterior('C++').probabilities.map(({ probability }) => probability), [0.5, 0.5])
  assert.equal(explorer.textMatches('Chair', 1)[0]?.concept.id, 'cpp')
})

test('seed aliases follow canonical slugs when a seed-version snapshot uses application IDs', () => {
  const seed = buildSeedSnapshot()
  const id = (value) => `application:${value}`
  const snapshot = {
    ...seed,
    concepts: seed.concepts.map((concept) => ({
      ...concept,
      id: id(concept.id),
      parentIds: concept.parentIds.map(id),
      childIds: concept.childIds.map(id),
      primaryPath: concept.primaryPath.map(id),
    })),
  }
  const explorer = createOntologyExplorer(snapshot)
  assert.equal(explorer.textMatches('AI', 1)[0]?.concept.id, 'application:artificial-intelligence')
  assert.equal(explorer.posterior('AI').probabilities[0]?.concept.id, 'application:artificial-intelligence')
  assert.equal(explorer.textMatches('golang', 1)[0]?.concept.id, 'application:go-language')
})

test('caller-approved aliases use canonical IDs and never replace a canonical label', () => {
  const snapshot = textCalibrationSnapshot()
  const explorer = createOntologyExplorer(snapshot, {
    exactAliases: new Map([
      ['  SHUTTLE  ', 'node-loom'],
      ['Kiln', 'node-loom'],
      ['unbound', 'missing-id'],
    ]),
  })
  assert.equal(explorer.textMatches('shuttle', 1)[0]?.concept.id, 'node-loom')
  assert.equal(explorer.posterior('shuttle').probabilities[0]?.concept.id, 'node-loom')
  assert.equal(explorer.textMatches('Kiln', 1)[0]?.concept.id, 'node-kiln')
  assert.deepEqual(explorer.textMatches('unbound'), [])
  assert.deepEqual(createOntologyExplorer(snapshot).textMatches('shuttle'), [], 'aliases stay local to their configured explorer')
  assert.deepEqual(explorer.selectedIds(), [], 'approved labels may rank a suggestion but do not confirm a selection')
})
