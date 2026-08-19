# querygraph/ontology operations guidance

Read ONTOLOGY.md first: it defines the three-layer contract (this repo =
data engineering; Verdun = interactive UI/selection; applications =
specialization).

- `src/normalization-core.mjs` pins Unicode 17.0 tables. Never let a runtime
  upgrade change comparison keys implicitly; table updates are one reviewed
  normalizer-version change coordinated with downstream stores (DevReal's
  SQL twin function included).
- Matching semantics are load-bearing: only a unique exact canonical name or
  approved alias may auto-reuse; everything fuzzy is a suggestion. Do not
  loosen thresholds to "improve" recall.
- The seed must stay a valid polyhierarchy: every non-area concept has at
  least one parent, areas have none, slugs are unique, `buildSeedSnapshot()`
  must not throw. Tests enforce this.
- `dist/` is committed so applications can consume
  `github:querygraph/ontology#<commit>` without a build step. Run `npm test`
  (which rebuilds) before every commit that touches `src/`.
- Extraction stays exact-key only. Fuzzy text mining belongs behind
  interactive confirmation in consuming applications.
- Consumers: devreal (re-exports the engine), verdun `frontend/ontology-ui`
  (chooser UI), disappointed (topic gauge + nomination flow).
- The Rust workspace (`rust/`) must stay parity-locked to the JS engine:
  `npm run build` regenerates `dist/seed.json`, `rust/ontology-core/src/tables.rs`,
  the golden fixture, and `db/seeds/seed_ontology.sql`; run `cargo test` in
  `rust/` after any normalization or seed change. Never edit generated files.
- There is no shared database, ever. `db/ontology-migrations` is a manifest
  applications apply to their own databases; rows never cross applications.
