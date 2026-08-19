//! The shared cold-start seed, embedded from `dist/seed.json` — the single
//! source of truth generated from the canonical TypeScript definitions.

use crate::normalization::normalize_topic_label;
use serde::Deserialize;
use std::collections::BTreeMap;
use std::sync::OnceLock;

pub const SEED_JSON: &str = include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/../../dist/seed.json"));

#[derive(Debug, Clone, Deserialize)]
pub struct SeedConcept {
    pub slug: String,
    pub name: String,
    pub level: String,
    pub summary: String,
    #[serde(default)]
    pub parents: Vec<String>,
    #[serde(default)]
    pub aliases: Vec<String>,
    #[serde(default)]
    pub emoji: Option<String>,
}

#[derive(Debug, Deserialize)]
struct SeedFile {
    version: u32,
    concepts: Vec<SeedConcept>,
}

/// A materialized concept mirroring the navigator's `TopicConcept` shape.
#[derive(Debug, Clone)]
pub struct Concept {
    pub slug: String,
    pub name: String,
    pub level: String,
    pub summary: String,
    pub parent_slugs: Vec<String>,
    pub child_slugs: Vec<String>,
    pub primary_path: Vec<String>,
    pub aliases: Vec<String>,
    pub emoji: Option<String>,
}

fn seed_file() -> &'static SeedFile {
    static SEED: OnceLock<SeedFile> = OnceLock::new();
    SEED.get_or_init(|| serde_json::from_str(SEED_JSON).expect("embedded seed.json is valid"))
}

pub fn seed_version() -> u32 {
    seed_file().version
}

pub fn seed_concepts() -> &'static [SeedConcept] {
    &seed_file().concepts
}

/// Build the snapshot: child order follows seed declaration order, and the
/// primary path walks each concept's first declared parent, exactly like the
/// TypeScript `buildSeedSnapshot`.
pub fn build_seed_snapshot() -> Vec<Concept> {
    let seed = seed_concepts();
    let by_slug: BTreeMap<&str, &SeedConcept> =
        seed.iter().map(|concept| (concept.slug.as_str(), concept)).collect();
    let mut children: BTreeMap<&str, Vec<String>> = BTreeMap::new();
    for concept in seed {
        for parent in &concept.parents {
            assert!(by_slug.contains_key(parent.as_str()), "seed concept {} names unknown parent {parent}", concept.slug);
            children.entry(parent.as_str()).or_default().push(concept.slug.clone());
        }
    }
    seed.iter()
        .map(|concept| {
            let mut path = Vec::new();
            let mut cursor = Some(*by_slug.get(concept.slug.as_str()).expect("known concept"));
            while let Some(current) = cursor {
                assert!(!path.contains(&current.slug), "seed cycle through {}", current.slug);
                path.insert(0, current.slug.clone());
                cursor = current.parents.first().and_then(|parent| by_slug.get(parent.as_str()).copied());
            }
            Concept {
                slug: concept.slug.clone(),
                name: concept.name.clone(),
                level: concept.level.clone(),
                summary: concept.summary.clone(),
                parent_slugs: concept.parents.clone(),
                child_slugs: children.get(concept.slug.as_str()).cloned().unwrap_or_default(),
                primary_path: path,
                aliases: concept.aliases.clone(),
                emoji: concept.emoji.clone(),
            }
        })
        .collect()
}

/// Normalized label (names, slugs, aliases) → concept slug, first wins.
pub fn seed_alias_index() -> BTreeMap<String, String> {
    let mut index = BTreeMap::new();
    for concept in seed_concepts() {
        for label in std::iter::once(&concept.name)
            .chain(std::iter::once(&concept.slug))
            .chain(concept.aliases.iter())
        {
            let key = normalize_topic_label(label);
            if !key.is_empty() {
                index.entry(key).or_insert_with(|| concept.slug.clone());
            }
        }
    }
    index
}
