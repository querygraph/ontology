//! Cross-language parity: the Rust normalizer and extractor must agree with
//! the canonical JS engine on the generated golden fixture.

use ontology_core::{extract_topics, normalize_topic_label, seed_alias_index};
use serde::Deserialize;

#[derive(Deserialize)]
struct Fixture {
    golden: Vec<GoldenEntry>,
    extraction: ExtractionFixture,
}

#[derive(Deserialize)]
struct GoldenEntry {
    label: String,
    key: String,
}

#[derive(Deserialize)]
struct ExtractionFixture {
    text: String,
    slugs: Vec<String>,
}

fn fixture() -> Fixture {
    serde_json::from_str(include_str!("fixtures/normalization-golden.json")).expect("valid fixture")
}

#[test]
fn normalization_matches_the_javascript_engine() {
    let fixture = fixture();
    let mut failures = Vec::new();
    for entry in &fixture.golden {
        let actual = normalize_topic_label(&entry.label);
        if actual != entry.key {
            failures.push(format!("{:?}: js={:?} rust={:?}", entry.label, entry.key, actual));
        }
    }
    assert!(failures.is_empty(), "normalization parity failures:\n{}", failures.join("\n"));
}

#[test]
fn extraction_matches_the_javascript_engine() {
    let fixture = fixture();
    let index = seed_alias_index();
    let mut slugs: Vec<String> = extract_topics(&fixture.extraction.text, &index, 4, 20)
        .into_iter()
        .map(|entry| entry.slug)
        .collect();
    slugs.sort();
    assert_eq!(slugs, fixture.extraction.slugs);
}

#[test]
fn seed_snapshot_is_a_valid_polyhierarchy() {
    let snapshot = ontology_core::build_seed_snapshot();
    assert!(snapshot.len() >= 80);
    for concept in &snapshot {
        if concept.level == "area" {
            assert!(concept.parent_slugs.is_empty(), "{} is an area with parents", concept.slug);
        } else {
            assert!(!concept.parent_slugs.is_empty(), "{} has no parents", concept.slug);
        }
        assert_eq!(concept.primary_path.last(), Some(&concept.slug));
    }
}
