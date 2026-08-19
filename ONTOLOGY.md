# The querygraph ontology architecture

Written 2026-08-19, when the ontology engineering was extracted from DevReal
into this repository. This document is the contract between the three layers;
each repository's AGENTS.md points here.

## The layering

```
querygraph/ontology           (this repo — data engineering)
  JS:   durable normalization · matching · three-tier navigator view-model ·
        cold-start seed taxonomy · topic extraction · chooser conformance
  Rust: ontology-core (normalization with golden-fixture key parity, seed,
        extraction) · ontology-graph (Grust property-graph projection)
  SQL:  db/migrations + generated seed — the shared *shape* of a topic store
        │
@querygraph/verdun            (interaction layer: Vue chooser UI)
somme                         (CLI-family machinery for topic commands)
        │
applications                  (specialization — each with ITS OWN database)
  devreal        React UI + its relational ontology/graph store, proposals,
                 review, path optimization; grust projection in graph-wasm
  disappointed   vanilla-DOM gauge; concepts materialize into dis_topic;
                 Rust pipeline for extraction/labeling
```

**Shared machinery, never shared data.** There is no shared database and no
shared dataset — not for the ontology, not for the graph. Every application
applies the SQL manifest (`db/ontology-migrations`) and the seed to its own
database, grows its own topics, and runs the same algorithms (matching,
solicitation/labeling gates, extraction, navigation) over its own rows.
Corrections to the *machinery* — the schema shapes, the seed taxonomy, the
normalizer — flow through this repository so every application inherits them;
rows never do.

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

- **Data.** This repo ships storage *shapes* (`db/migrations/0001_ontology.sql`:
  onto_concept/edge/alias/proposal/label, plus the generated idempotent seed
  SQL) but never rows. DevReal additionally keeps its richer relational store
  (versions, path aggregates, optimization runs) — see
  `devreal/docs/TOPIC-ONTOLOGY.md`; disappointed keeps `dis_topic`. The
  `onto_label.subject_id` and `onto_proposal.proposed_by` columns are opaque
  app-defined identifiers precisely so this schema never references an
  application's own tables.
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
- Every chooser skin must pass `runChooserConformance` from `./conformance`
  in its own test suite (Verdun: `smoke:ontology-conformance`; disappointed:
  `tests/gauge-conformance.test.mjs`). The runner derives truth from the
  engine, so skins that re-derive selection logic fail loudly.

## Provenance

Extracted verbatim (import paths aside) from DevReal on 2026-08-19:
`lib/topic-normalization-core.mjs` → `src/normalization-core.mjs`,
`lib/topic-normalization.ts` → `src/normalization.ts`,
`lib/topic-matching.ts` → `src/matching.ts`,
`lib/topic-ui.ts` → `src/navigator.ts`.
DevReal now re-exports these from the package, so its store, routes, and
tests keep their import paths. The seed and extraction modules are new here.

## The Rust backend

`rust/` is a cargo workspace consumed by application pipelines and services
(git-pinned, like the JS package):

- **ontology-core** — `normalize_topic_label` (ported from the JS core; the
  Unicode tables in `src/tables.rs`, the seed in `dist/seed.json`, and the
  149-label golden fixture are all *generated from the JS engine* by
  `scripts/generate-rust-artifacts.mjs`, so the stacks cannot drift
  silently), seed snapshot building, and exact-key extraction. Persisted
  keys may come from either language: parity is test-enforced.
- **ontology-graph** — projects concepts (and app content labeled with them)
  into a `grust::Graph` (`concept` nodes, `within` edges, `about` edges), so
  any Grust `GraphStore` backend — memory for pipelines, grust-postgres for
  persistence — works without this repo choosing one. DevReal's `graph-wasm`
  is the same idea aimed at the browser.

## Roadmap

- LLM-assisted extraction and proposal drafting (behind the same
  human-confirmation gates).
- Ontology diff/merge tooling for promoting application-local concepts into
  the shared seed.
- Optimization-run contracts (DevReal's path-measurement machinery) once a
  second application records navigation paths.
