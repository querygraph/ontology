//! ontology-core: the Rust backend of querygraph/ontology's data
//! engineering. See ONTOLOGY.md for the layering contract. Shared machinery,
//! never shared data: every application applies this crate (and the SQL
//! manifest) against its own database and its own topics.

pub mod extraction;
pub mod normalization;
pub mod seed;
mod tables;

pub use extraction::{extract_topics, ExtractedTopic, DEFAULT_MAX_PHRASE_TOKENS};
pub use normalization::{normalize_topic_label, topic_label_tokens};
pub use seed::{build_seed_snapshot, seed_alias_index, seed_concepts, seed_version, Concept, SeedConcept};
