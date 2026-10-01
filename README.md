# @querygraph/ontology

Framework-neutral topic-ontology engineering: durable normalization, honest
matching, navigator and explorer view-models, a cold-start seed taxonomy, and
exact-key topic extraction from text. Rendered chooser UI belongs to Verdun
or the consuming application.

See ONTOLOGY.md for the architecture and AGENTS.md for operations guidance.

## Shared exploration

```ts
import {
  buildSeedSnapshot,
  createConceptTextIndex,
  createOntologyExplorer,
} from '@querygraph/ontology'

const snapshot = buildSeedSnapshot()
const explorer = createOntologyExplorer(snapshot)
explorer.toggle('writing')
explorer.toggle('poetry')

const { general, specific, different } = explorer.recommendations('a poem')
// general: ancestors of Poetry, excluding selected concepts
// specific: descendants of Poetry (none in the seed)
// different: candidates outside the current ancestor/descendant closure

// Applications can supply their own reviewed language without adding aliases.
const textIndex = createConceptTextIndex(snapshot, {
  ontologyVersionId: snapshot.versionId,
  version: 'my-app-language-v1',
  representatives: { journaling: 'my private morning pages' },
})
const specialized = createOntologyExplorer(snapshot, { textIndex })
const suggestions = specialized.textMatches('morning pages')
```

The last selected concept anchors broader and narrower recommendations;
earlier selections remain Bayesian evidence. Recommendation scores express
expected information gain in bits. Text-match scores express relevance, with
exact names and approved aliases ranked before semantic and fuzzy
suggestions. Nothing in the explorer auto-selects or persists a suggestion.

The optional text model is used only when its `ontologyVersionId` matches
the snapshot. Each index is independent; representative language never
changes durable labels, approved aliases, or exact extraction. Supply an
index built over the same snapshot as its explorer. Applications retain
ownership of their language models and derived snapshot filters.

Compatible seed snapshots inherit seed aliases by canonical slug, including
when an application assigns its own concept IDs. Other snapshots match only
their own canonical names and slugs by default. Use the optional
`exactAliases: ReadonlyMap<string, string>` explorer option for additional
approved labels, mapped to canonical concept IDs. Labels are normalized
internally and cannot override canonical names or slugs.

The APIs and their types are also available from the `./explorer` and
`./concept-text` package subpaths. See `ONTOLOGY_POSTERIOR_SAMPLE_LIMIT` for
the bound on deterministic posterior sampling in larger graphs; small graphs
use exact information-gain ranking.
