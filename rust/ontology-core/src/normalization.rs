//! Rust port of the canonical JS normalizer (`src/normalization-core.mjs`).
//! Cross-language key parity is enforced by the golden fixture in
//! `tests/fixtures/normalization-golden.json`, regenerated from the JS engine
//! by `scripts/generate-rust-artifacts.mjs`. Behavior changes are one
//! reviewed normalizer-version change across both stacks.

use crate::tables::{ALPHANUMERIC_RANGES, DASH_RANGES, FORMAT_RANGES, MARK_RANGES};
use unicode_normalization::UnicodeNormalization;

fn in_ranges(code_point: u32, ranges: &[(u32, u32)]) -> bool {
    let mut low = 0usize;
    let mut high = ranges.len();
    while low < high {
        let middle = (low + high) / 2;
        let (start, end) = ranges[middle];
        if code_point < start {
            high = middle;
        } else if code_point > end {
            low = middle + 1;
        } else {
            return true;
        }
    }
    false
}

/// Mirrors `preNormalizeUnicode17` in the JS core: Unicode 17.0 additions
/// mapped ahead of the runtime's (possibly older) NFKC tables.
fn pre_normalize_unicode17(value: &str) -> String {
    let mut result = String::with_capacity(value.len());
    for character in value.chars() {
        let cp = character as u32;
        match cp {
            0x1c89 => result.push('\u{1c8a}'),
            0xa7cb => result.push('\u{264}'),
            0xa7cc => result.push('\u{a7cd}'),
            0xa7ce => result.push('\u{a7cf}'),
            0xa7d2 => result.push('\u{a7d3}'),
            0xa7d4 => result.push('\u{a7d5}'),
            0xa7da => result.push('\u{a7db}'),
            0xa7dc => result.push('\u{19b}'),
            0xa7f1 => result.push('S'),
            0x105c9 => result.push('\u{105d2}'),
            0x105e4 => result.push('\u{105da}'),
            0x10d50..=0x10d65 => result.push(char::from_u32(cp + 0x20).unwrap_or(character)),
            0x11383 => result.push('\u{11382}'),
            0x11385 => result.push('\u{11384}'),
            0x1138e => result.push('\u{1138b}'),
            0x11391 => result.push('\u{11390}'),
            0x16d68 => {
                result.push('\u{16d67}');
                result.push('\u{16d67}');
            }
            0x16d69 => {
                result.push('\u{16d63}');
                result.push('\u{16d67}');
            }
            0x16d6a => {
                result.push('\u{16d63}');
                result.push('\u{16d67}');
                result.push('\u{16d67}');
            }
            0x16ea0..=0x16eb8 => result.push(char::from_u32(cp + 0x1b).unwrap_or(character)),
            0x1ccd6..=0x1ccef => result.push(char::from_u32(0x41 + cp - 0x1ccd6).unwrap_or(character)),
            0x1ccf0..=0x1ccf9 => result.push(char::from_u32(0x30 + cp - 0x1ccf0).unwrap_or(character)),
            _ => result.push(character),
        }
    }
    result
}

fn strip_ranges(value: &str, ranges: &[(u32, u32)]) -> String {
    value.chars().filter(|c| !in_ranges(*c as u32, ranges)).collect()
}

/// Collapse `\s*X\s*` to `X` for one separator character.
fn collapse_around(value: &str, separator: char) -> String {
    let mut result = String::with_capacity(value.len());
    let mut chars = value.chars().peekable();
    while let Some(character) = chars.next() {
        if character == separator {
            while result.ends_with(' ') {
                result.pop();
            }
            result.push(separator);
            while chars.peek() == Some(&' ') {
                chars.next();
            }
        } else {
            result.push(character);
        }
    }
    result
}

fn dedupe_runs(value: &str, separator: char) -> String {
    let mut result = String::with_capacity(value.len());
    let mut previous_was = false;
    for character in value.chars() {
        if character == separator {
            if !previous_was {
                result.push(character);
            }
            previous_was = true;
        } else {
            result.push(character);
            previous_was = false;
        }
    }
    result
}

fn collapse_spaces(value: &str) -> String {
    let mut result = String::with_capacity(value.len());
    let mut previous_space = false;
    for character in value.chars() {
        if character == ' ' {
            if !previous_space {
                result.push(' ');
            }
            previous_space = true;
        } else {
            result.push(character);
            previous_space = false;
        }
    }
    result
}

/// The durable topic comparison key. `+`, `#`, `.`, and `/` stay meaningful
/// so C, C++, C#, .NET, Node.js, and CI/CD never collapse together.
pub fn normalize_topic_label(value: &str) -> String {
    let pre = pre_normalize_unicode17(value);
    let nfkc: String = pre.nfkc().collect();
    let without_format = strip_ranges(&nfkc, FORMAT_RANGES);
    let nfd: String = without_format.nfd().collect();
    let without_marks = strip_ranges(&nfd, MARK_RANGES);
    let lowered = without_marks.to_lowercase();

    let mut mapped = String::with_capacity(lowered.len());
    for character in lowered.chars() {
        match character {
            '\u{266f}' => mapped.push('#'),
            '\u{2018}' | '\u{2019}' | '\u{02bc}' | '\'' => {}
            '&' => mapped.push_str(" and "),
            c if in_ranges(c as u32, DASH_RANGES) => mapped.push(' '),
            c => mapped.push(c),
        }
    }

    let replaced: String = mapped
        .chars()
        .map(|c| {
            if in_ranges(c as u32, ALPHANUMERIC_RANGES) || matches!(c, '+' | '#' | '.' | '/') {
                c
            } else {
                ' '
            }
        })
        .collect();

    let mut collapsed = replaced;
    for separator in ['/', '.', '+', '#'] {
        collapsed = collapse_around(&collapsed, separator);
    }
    collapsed = dedupe_runs(&collapsed, '.');
    collapsed = dedupe_runs(&collapsed, '/');
    collapsed = collapse_spaces(&collapsed);
    let trimmed_lead = collapsed.trim_start_matches('/');
    let trimmed = trimmed_lead.trim_end_matches(['.', '/']);
    trimmed.trim_matches(' ').to_string()
}

/// Tokens of the normalized label, split on whitespace and `/`.
pub fn topic_label_tokens(value: &str) -> Vec<String> {
    normalize_topic_label(value)
        .split([' ', '/'])
        .filter(|token| !token.is_empty())
        .map(str::to_string)
        .collect()
}
