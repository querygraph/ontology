import { normalizeTopicLabel } from './normalization.js';
import { seedAliasIndex } from './seed.js';
/** Index a snapshot's labels for extraction; pair with seedAliasIndex for seeds. */
export function snapshotLabelIndex(snapshot) {
    const index = new Map();
    for (const concept of snapshot.concepts) {
        for (const label of [concept.name, concept.slug]) {
            const key = normalizeTopicLabel(label);
            if (key && !index.has(key))
                index.set(key, concept.id);
        }
    }
    return index;
}
export function extractTopicsFromText(text, snapshot, options = {}) {
    const byId = new Map(snapshot.concepts.map((concept) => [concept.id, concept]));
    const index = snapshotLabelIndex(snapshot);
    for (const [key, slug] of options.aliases ?? []) {
        if (!index.has(key) && byId.has(slug))
            index.set(key, slug);
    }
    const maxTokens = Math.max(1, Math.min(options.maxPhraseTokens ?? 4, 8));
    const tokens = normalizeTopicLabel(text).split(' ').filter(Boolean);
    const found = new Map();
    // Longest-match-first per position so "machine learning" never double
    // counts as "machine" plus "learning".
    let position = 0;
    while (position < tokens.length) {
        let advanced = 1;
        for (let length = Math.min(maxTokens, tokens.length - position); length >= 1; length -= 1) {
            const phrase = tokens.slice(position, position + length).join(' ');
            const slug = index.get(phrase);
            if (!slug)
                continue;
            const entry = found.get(slug) ?? { occurrences: 0, matches: new Set() };
            entry.occurrences += 1;
            entry.matches.add(phrase);
            found.set(slug, entry);
            advanced = length;
            break;
        }
        position += advanced;
    }
    const results = [...found.entries()].flatMap(([slug, entry]) => {
        const concept = byId.get(slug);
        return concept ? [{ concept, occurrences: entry.occurrences, matches: [...entry.matches] }] : [];
    }).sort((left, right) => right.occurrences - left.occurrences || left.concept.name.localeCompare(right.concept.name));
    return results.slice(0, Math.max(1, options.limit ?? 20));
}
/** Convenience: extraction over the built-in seed with its aliases applied. */
export function extractSeedTopics(text, snapshot, seed, options = {}) {
    return extractTopicsFromText(text, snapshot, { ...options, aliases: options.aliases ?? seedAliasIndex(seed) });
}
