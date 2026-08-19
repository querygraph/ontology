//! Exact-key n-gram topic extraction, the Rust twin of the TypeScript
//! `extraction` module: longest match first, no fuzzy guessing.

use crate::normalization::normalize_topic_label;
use std::collections::BTreeMap;

#[derive(Debug, Clone, PartialEq)]
pub struct ExtractedTopic {
    pub slug: String,
    pub occurrences: u32,
    pub matches: Vec<String>,
}

pub const DEFAULT_MAX_PHRASE_TOKENS: usize = 4;

/// Extract topics from free text against a normalized label → slug index
/// (see `seed_alias_index`). Longest match wins per position, so
/// "machine learning" never double counts as "machine" plus "learning".
pub fn extract_topics(
    text: &str,
    index: &BTreeMap<String, String>,
    max_phrase_tokens: usize,
    limit: usize,
) -> Vec<ExtractedTopic> {
    let normalized = normalize_topic_label(text);
    let tokens: Vec<&str> = normalized.split(' ').filter(|token| !token.is_empty()).collect();
    let max_tokens = max_phrase_tokens.clamp(1, 8);

    let mut found: BTreeMap<String, (u32, Vec<String>)> = BTreeMap::new();
    let mut position = 0usize;
    while position < tokens.len() {
        let mut advanced = 1usize;
        let longest = max_tokens.min(tokens.len() - position);
        for length in (1..=longest).rev() {
            let phrase = tokens[position..position + length].join(" ");
            if let Some(slug) = index.get(&phrase) {
                let entry = found.entry(slug.clone()).or_insert((0, Vec::new()));
                entry.0 += 1;
                if !entry.1.contains(&phrase) {
                    entry.1.push(phrase);
                }
                advanced = length;
                break;
            }
        }
        position += advanced;
    }

    let mut results: Vec<ExtractedTopic> = found
        .into_iter()
        .map(|(slug, (occurrences, matches))| ExtractedTopic { slug, occurrences, matches })
        .collect();
    results.sort_by(|left, right| {
        right.occurrences.cmp(&left.occurrences).then_with(|| left.slug.cmp(&right.slug))
    });
    results.truncate(limit.max(1));
    results
}
