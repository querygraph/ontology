# The querygraph ontology architecture

Written 2026-08-19, when the ontology engineering was extracted from DevReal
into this repository. This document is the contract between the three layers;
each repository's AGENTS.md points here.

## The layering

```
@querygraph/ontology          (this repo — data engineering)
  durable normalization · matching · three-tier navigator view-model ·
  cold-start seed taxonomy · topic extraction from text
        │
@querygraph/verdun            (interaction layer)
  frontend/ontology-ui: the Vue three-tier chooser over the navigator
        │
applications                  (specialization)
  devreal        React UI over the shared engine; owns its relational
                 ontology store, proposals, review, path optimization runs
  disappointed   vanilla-DOM gauge over the navigator; ontology concepts
                 materialize into dis_topic rows on demand
```

**Cold-start ontology and topic extraction from text live here.** Interactive
UI and selection live in Verdun. Applications reuse and specialize; they do
not fork the normalizer or the seed.

## What this package owns

- **`normalization`** — the durable comparison key. Unicode 17.0 tables are
  pinned in `src/normalization-core.mjs`; `C`, `C++`, `C#`, `.NET`,
  `Node.js`, and `CI/CD` stay distinct. A Node/ICU upgrade must never
  silently change keys: updating the tables is one reviewed
  normalizer-version change, coordinated with every store that persists keys
  (DevReal's SQL function included).
- **`matching`** — resolution of user-entered labels against visible
  concepts: unique exact canonical name or approved alias reuses
  automatically; prefix/acronym/edit/trigram evidence only ever *suggests*;
  short developer labels are exact-only; `gateTopicProposal` gates the
  explicit "add a new topic" action.
- **`navigator`** — the framework-neutral three-tier view-model
  (Area / Focus / Specific): snapshots, routes, bands, primary trails,
  backtrack semantics, local search, and content-result normalization. This
  is the "Quora-like gauge": from any concept the UI can show higher-level
  concepts (the trail), peers (siblings in the band), and more detailed
  concepts (children).
- **`seed`** — the cold-start taxonomy (~90 concepts, 11 areas, a
  polyhierarchy: one concept may have several parents). Applications boot
  from `buildSeedSnapshot()` before any community proposal exists.
- **`extraction`** — exact-key n-gram extraction of seeded topics from free
  text (longest match first). Extraction proposes; it never fuzzy-guesses.
  Interactive fuzziness belongs to `matching`, where a person confirms.

## What this package does not own

- **Storage.** DevReal keeps its relational ontology store (concepts backed
  by graph entities, aliases with provenance, immutable published navigation
  versions, proposals, path aggregates, optimization runs) — see
  `devreal/docs/TOPIC-ONTOLOGY.md`. Disappointed keeps `dis_topic` +
  `dis_topic_edge`. Storage schemas consume this package's keys and shapes.
- **Review and governance.** Proposal review, alias approval, and version
  publication are application workflows.
- **Rendered UI.** Verdun ships the reusable chooser; apps may also render
  the navigator directly (disappointed's vanilla gauge, DevReal's React
  bands).

## Consumption rules

- Verdun exposes the chooser as an isolated module: `@querygraph/ontology`
  and `vue` are *optional peer dependencies* there, so accounts-only Verdun
  consumers never install the ontology stack. Apps that mount the chooser
  declare and pin this package themselves.

- Depend on a pinned release or commit
  (`github:querygraph/ontology#<commit>`), never a sibling path: an ontology
  regression must not change an already-resolved application build.
- Persisted comparison keys come only from `normalizeTopicLabel`. Never
  hand-roll a slugifier for ontology labels.
- The seed is a *starting point*: applications may extend it with their own
  concepts, but corrections and additions of general interest belong here so
  every application inherits them.
- Snapshots are immutable values. Derive; don't mutate.

## Provenance

Extracted verbatim (import paths aside) from DevReal on 2026-08-19:
`lib/topic-normalization-core.mjs` → `src/normalization-core.mjs`,
`lib/topic-normalization.ts` → `src/normalization.ts`,
`lib/topic-matching.ts` → `src/matching.ts`,
`lib/topic-ui.ts` → `src/navigator.ts`.
DevReal now re-exports these from the package, so its store, routes, and
tests keep their import paths. The seed and extraction modules are new here.

## Roadmap

- LLM-assisted extraction and proposal drafting (behind the same
  human-confirmation gates).
- Ontology diff/merge tooling for promoting application-local concepts into
  the shared seed.
- Optimization-run contracts (DevReal's path-measurement machinery) once a
  second application records navigation paths.
