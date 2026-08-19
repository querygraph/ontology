import { normalizeTopicLabel } from './normalization.js';
export const SEED_VERSION = 1;
/* eslint-disable max-len */
export const SEED_CONCEPTS = [
    // ---- areas ----
    { slug: 'technology', name: 'Technology', level: 'area', summary: 'Computing, software, devices, and the industry that ships them.', emoji: '💻' },
    { slug: 'science', name: 'Science', level: 'area', summary: 'How the universe works, and how we find out.', emoji: '🔬' },
    { slug: 'politics', name: 'Politics & government', level: 'area', summary: 'Power, policy, institutions, and the people running them.', emoji: '🏛️' },
    { slug: 'business', name: 'Business & economy', level: 'area', summary: 'Money, markets, work, and the companies in between.', emoji: '📈' },
    { slug: 'culture', name: 'Arts & culture', level: 'area', summary: 'What we make, watch, read, and argue about.', emoji: '🎭' },
    { slug: 'health', name: 'Health', level: 'area', summary: 'Bodies, minds, and the systems meant to care for them.', emoji: '🩺' },
    { slug: 'sports', name: 'Sports', level: 'area', summary: 'Games people play and the industries around them.', emoji: '🏟️' },
    { slug: 'food', name: 'Food & drink', level: 'area', summary: 'Eating, cooking, and everyone who serves it.', emoji: '🍽️' },
    { slug: 'places', name: 'Places & travel', level: 'area', summary: 'Cities, countries, and getting between them.', emoji: '🗺️' },
    { slug: 'society', name: 'Society', level: 'area', summary: 'How we live together: institutions, norms, and their frictions.', emoji: '👥' },
    { slug: 'everyday-life', name: 'Everyday life', level: 'area', summary: 'The small recurring experiences that shape a day.', emoji: '📅' },
    // ---- technology focus ----
    { slug: 'programming-languages', name: 'Programming languages', level: 'focus', summary: 'The languages software is written in.', parents: ['technology'] },
    { slug: 'artificial-intelligence', name: 'Artificial intelligence', level: 'focus', summary: 'Machine intelligence: models, applications, consequences.', parents: ['technology', 'science'], aliases: ['AI'] },
    { slug: 'software-engineering', name: 'Software engineering', level: 'focus', summary: 'Building and operating software systems.', parents: ['technology'] },
    { slug: 'internet-web', name: 'Internet & web', level: 'focus', summary: 'The networked layer everyone lives on.', parents: ['technology'] },
    { slug: 'data-databases', name: 'Data & databases', level: 'focus', summary: 'Storing, moving, and questioning data.', parents: ['technology'] },
    { slug: 'security-privacy', name: 'Security & privacy', level: 'focus', summary: 'Keeping systems and people safe, or failing to.', parents: ['technology'] },
    { slug: 'hardware-devices', name: 'Hardware & devices', level: 'focus', summary: 'The physical machines computing runs on.', parents: ['technology'] },
    // ---- technology topics ----
    { slug: 'python', name: 'Python', level: 'topic', summary: 'The language everyone starts with and science never leaves.', parents: ['programming-languages'], aliases: ['python programming'] },
    { slug: 'javascript', name: 'JavaScript', level: 'topic', summary: 'The language of the web, for better and worse.', parents: ['programming-languages', 'internet-web'], aliases: ['js'] },
    { slug: 'typescript', name: 'TypeScript', level: 'topic', summary: 'JavaScript with a seatbelt.', parents: ['programming-languages'], aliases: ['ts'] },
    { slug: 'rust-language', name: 'Rust', level: 'topic', summary: 'Memory safety with an evangelism arm.', parents: ['programming-languages'] },
    { slug: 'go-language', name: 'Go', level: 'topic', summary: 'Small language, big deployments.', parents: ['programming-languages'], aliases: ['golang'] },
    { slug: 'java', name: 'Java', level: 'topic', summary: 'The enterprise workhorse.', parents: ['programming-languages'] },
    { slug: 'cpp', name: 'C++', level: 'topic', summary: 'Power tools, no guard rails.', parents: ['programming-languages'] },
    { slug: 'csharp', name: 'C#', level: 'topic', summary: "Microsoft's Java, now everywhere.", parents: ['programming-languages'] },
    { slug: 'scala', name: 'Scala', level: 'topic', summary: 'Functional programming on the JVM.', parents: ['programming-languages'] },
    { slug: 'machine-learning', name: 'Machine learning', level: 'topic', summary: 'Statistical models that learn from data.', parents: ['artificial-intelligence'], aliases: ['ml'] },
    { slug: 'llms', name: 'Large language models', level: 'topic', summary: 'Text predictors that ate the industry.', parents: ['artificial-intelligence'], aliases: ['llm'] },
    { slug: 'ai-slop', name: 'AI slop', level: 'topic', summary: 'Synthetic content flooding every feed.', parents: ['artificial-intelligence', 'internet-web'] },
    { slug: 'open-source', name: 'Open source', level: 'topic', summary: 'Software in public, maintained by too few.', parents: ['software-engineering'], aliases: ['oss'] },
    { slug: 'devops', name: 'DevOps', level: 'topic', summary: 'Shipping and running software, on call.', parents: ['software-engineering'], aliases: ['ci/cd'] },
    { slug: 'social-media', name: 'Social media', level: 'topic', summary: 'Feeds, follows, and their discontents.', parents: ['internet-web', 'society'] },
    { slug: 'search-engines', name: 'Search engines', level: 'topic', summary: 'Finding things online, allegedly.', parents: ['internet-web'] },
    { slug: 'streaming', name: 'Streaming', level: 'topic', summary: 'All of media, one subscription at a time.', parents: ['internet-web', 'culture'] },
    { slug: 'smartphones', name: 'Smartphones', level: 'topic', summary: 'The rectangle in your pocket.', parents: ['hardware-devices'] },
    { slug: 'databases', name: 'Databases', level: 'topic', summary: 'Where the data actually lives.', parents: ['data-databases'] },
    { slug: 'data-breaches', name: 'Data breaches', level: 'topic', summary: 'Your records, someone else s download.', parents: ['security-privacy'] },
    // ---- science ----
    { slug: 'physics', name: 'Physics', level: 'focus', summary: 'Matter, energy, and their rules.', parents: ['science'] },
    { slug: 'life-sciences', name: 'Life sciences', level: 'focus', summary: 'Living systems, from cells to ecosystems.', parents: ['science'] },
    { slug: 'earth-climate', name: 'Earth & climate', level: 'focus', summary: 'The planet and its changing weather.', parents: ['science'] },
    { slug: 'space', name: 'Space', level: 'topic', summary: 'Rockets, telescopes, and the void.', parents: ['physics'], aliases: ['space exploration'] },
    { slug: 'climate-change', name: 'Climate change', level: 'topic', summary: 'The slow emergency.', parents: ['earth-climate'] },
    { slug: 'weather', name: 'Weather', level: 'topic', summary: 'Daily atmospheric disappointment.', parents: ['earth-climate', 'everyday-life'] },
    { slug: 'mathematics', name: 'Mathematics', level: 'topic', summary: 'The language everything else is written in.', parents: ['science'] },
    // ---- politics ----
    { slug: 'national-government', name: 'National government', level: 'focus', summary: 'The federal apparatus and its output.', parents: ['politics'], aliases: ['government'] },
    { slug: 'elections', name: 'Elections', level: 'focus', summary: 'Choosing the people who disappoint us next.', parents: ['politics'] },
    { slug: 'geopolitics', name: 'Geopolitics', level: 'focus', summary: 'Nations maneuvering around each other.', parents: ['politics'] },
    { slug: 'local-government', name: 'Local government', level: 'focus', summary: 'City halls, budgets, and potholes.', parents: ['politics', 'places'] },
    { slug: 'congress', name: 'Congress', level: 'topic', summary: 'The legislative branch, technically.', parents: ['national-government'] },
    { slug: 'public-policy', name: 'Public policy', level: 'topic', summary: 'What governments actually do.', parents: ['national-government'] },
    // ---- business ----
    { slug: 'economy', name: 'The economy', level: 'focus', summary: 'Prices, growth, and the general vibe.', parents: ['business'] },
    { slug: 'work', name: 'Jobs & work', level: 'focus', summary: 'Employment and its discontents.', parents: ['business', 'society'] },
    { slug: 'companies', name: 'Companies', level: 'focus', summary: 'The organizations selling you things.', parents: ['business'] },
    { slug: 'housing', name: 'Housing', level: 'topic', summary: 'Where you live and what it costs.', parents: ['economy', 'society'] },
    { slug: 'inflation', name: 'Inflation', level: 'topic', summary: 'Everything, more expensive.', parents: ['economy'] },
    { slug: 'big-tech', name: 'Big Tech', level: 'topic', summary: 'The five companies renting you the internet.', parents: ['companies', 'technology'] },
    { slug: 'startups', name: 'Startups', level: 'topic', summary: 'Optimism as a business model.', parents: ['companies'] },
    { slug: 'crypto', name: 'Crypto', level: 'topic', summary: 'Money, but exciting and combustible.', parents: ['companies', 'technology'], aliases: ['cryptocurrency'] },
    { slug: 'remote-work', name: 'Remote work', level: 'topic', summary: 'The office argument that never ends.', parents: ['work'] },
    // ---- culture ----
    { slug: 'film-tv', name: 'Film & TV', level: 'focus', summary: 'Moving pictures, large and small.', parents: ['culture'] },
    { slug: 'music', name: 'Music', level: 'focus', summary: 'Organized sound and its industries.', parents: ['culture'] },
    { slug: 'books', name: 'Books', level: 'focus', summary: 'Long-form text, printed or otherwise.', parents: ['culture'] },
    { slug: 'gaming', name: 'Video games', level: 'focus', summary: 'Interactive entertainment and its economies.', parents: ['culture', 'technology'] },
    { slug: 'movies', name: 'Movies', level: 'topic', summary: 'Two hours in the dark, hoping.', parents: ['film-tv'] },
    { slug: 'television', name: 'Television', level: 'topic', summary: 'Prestige, filler, and cancellations.', parents: ['film-tv'] },
    { slug: 'hip-hop', name: 'Hip-hop', level: 'topic', summary: 'The dominant genre, allegedly in decline.', parents: ['music'], aliases: ['rap'] },
    { slug: 'pop-music', name: 'Pop music', level: 'topic', summary: 'The charts and their machinery.', parents: ['music'] },
    { slug: 'podcasts', name: 'Podcasts', level: 'topic', summary: 'Two people talking, forever.', parents: ['culture', 'internet-web'] },
    // ---- health ----
    { slug: 'healthcare-system', name: 'Healthcare system', level: 'focus', summary: 'Care, coverage, and the bill afterwards.', parents: ['health', 'society'] },
    { slug: 'fitness', name: 'Fitness', level: 'topic', summary: 'The gym you meant to go to.', parents: ['health', 'everyday-life'] },
    { slug: 'mental-health', name: 'Mental health', level: 'topic', summary: 'The inner weather.', parents: ['health'] },
    { slug: 'nutrition', name: 'Nutrition', level: 'topic', summary: 'What you eat versus what you should.', parents: ['health', 'food'] },
    // ---- sports ----
    { slug: 'football', name: 'Football', level: 'topic', summary: 'American collisions, weekly heartbreak.', parents: ['sports'], aliases: ['nfl'] },
    { slug: 'basketball', name: 'Basketball', level: 'topic', summary: 'The long season and its dramas.', parents: ['sports'], aliases: ['nba'] },
    { slug: 'soccer', name: 'Soccer', level: 'topic', summary: 'The world game and its billionaires.', parents: ['sports'] },
    { slug: 'baseball', name: 'Baseball', level: 'topic', summary: 'Slow disappointment, beautifully kept statistics.', parents: ['sports'], aliases: ['mlb'] },
    // ---- food ----
    { slug: 'restaurants', name: 'Restaurants', level: 'focus', summary: 'Eating out and being let down at scale.', parents: ['food'] },
    { slug: 'cooking', name: 'Cooking', level: 'topic', summary: 'Doing it yourself, with mixed results.', parents: ['food'] },
    { slug: 'coffee', name: 'Coffee', level: 'topic', summary: 'The morning dependency.', parents: ['food', 'everyday-life'] },
    { slug: 'brunch', name: 'Brunch', level: 'topic', summary: 'Eggs, lines, and invoices.', parents: ['restaurants'] },
    // ---- places ----
    { slug: 'cities', name: 'Cities', level: 'focus', summary: 'Dense living and its frictions.', parents: ['places'] },
    { slug: 'countries', name: 'Countries', level: 'focus', summary: 'Nations as experiences.', parents: ['places'] },
    { slug: 'transportation', name: 'Transportation', level: 'focus', summary: 'Getting anywhere at all.', parents: ['places', 'everyday-life'] },
    { slug: 'public-transit', name: 'Public transit', level: 'topic', summary: 'The train that almost came.', parents: ['transportation'] },
    { slug: 'airlines', name: 'Airlines', level: 'topic', summary: 'Sky buses with dynamic pricing.', parents: ['transportation'] },
    { slug: 'traffic', name: 'Traffic', level: 'topic', summary: 'Everyone else, also driving.', parents: ['transportation'] },
    // ---- society ----
    { slug: 'education', name: 'Education', level: 'focus', summary: 'Learning and its institutions.', parents: ['society'] },
    { slug: 'media-journalism', name: 'Media & journalism', level: 'focus', summary: 'Who tells you what happened.', parents: ['society', 'culture'] },
    { slug: 'dating', name: 'Dating', level: 'topic', summary: 'The apps, the ghosting, the hope.', parents: ['society', 'everyday-life'], aliases: ['dating apps'] },
    { slug: 'universities', name: 'Universities', level: 'topic', summary: 'Higher education and higher invoices.', parents: ['education'] },
    { slug: 'cable-news', name: 'Cable news', level: 'topic', summary: 'The shouting channel.', parents: ['media-journalism'] },
    { slug: 'hoas', name: 'HOAs', level: 'topic', summary: 'Neighborhood governance at its pettiest.', parents: ['society', 'places'] },
    // ---- everyday life ----
    { slug: 'commuting', name: 'Commuting', level: 'topic', summary: 'The daily migration.', parents: ['everyday-life', 'transportation'] },
    { slug: 'customer-service', name: 'Customer service', level: 'topic', summary: 'Your call is important to someone, theoretically.', parents: ['everyday-life', 'business'] },
    { slug: 'group-chats', name: 'Group chats', level: 'topic', summary: 'The thread that never dies.', parents: ['everyday-life', 'social-media'] },
    { slug: 'robocalls', name: 'Robocalls', level: 'topic', summary: 'The phone, weaponized.', parents: ['everyday-life'] },
    { slug: 'self-improvement', name: 'Self-improvement', level: 'topic', summary: 'The better you, still pending.', parents: ['everyday-life', 'health'], aliases: ['myself'] },
];
/**
 * Materialize the seed as an immutable navigator snapshot. Concept ids are
 * their slugs, `childIds` derive from declared parents (in seed order), and
 * `primaryPath` follows each concept's first declared parent chain.
 */
export function buildSeedSnapshot(options = {}) {
    return buildSnapshot(SEED_CONCEPTS, options);
}
export function buildSnapshot(seed, options = {}) {
    const bySlug = new Map(seed.map((concept) => [concept.slug, concept]));
    const childIds = new Map();
    for (const concept of seed) {
        for (const parent of concept.parents ?? []) {
            if (!bySlug.has(parent))
                throw new Error(`seed concept ${concept.slug} names unknown parent ${parent}`);
            const children = childIds.get(parent) ?? [];
            children.push(concept.slug);
            childIds.set(parent, children);
        }
    }
    const primaryPath = (slug) => {
        const path = [];
        let cursor = bySlug.get(slug);
        const guard = new Set();
        while (cursor) {
            if (guard.has(cursor.slug))
                throw new Error(`seed cycle through ${cursor.slug}`);
            guard.add(cursor.slug);
            path.unshift(cursor.slug);
            cursor = cursor.parents?.[0] ? bySlug.get(cursor.parents[0]) : undefined;
        }
        return path;
    };
    const concepts = seed.map((concept) => ({
        id: concept.slug,
        slug: concept.slug,
        name: concept.name,
        summary: concept.summary,
        level: concept.level,
        selectable: true,
        parentIds: [...(concept.parents ?? [])],
        childIds: childIds.get(concept.slug) ?? [],
        primaryPath: primaryPath(concept.slug),
    }));
    return {
        versionId: options.versionId ?? `seed-v${options.version ?? SEED_VERSION}`,
        version: options.version ?? SEED_VERSION,
        concepts,
    };
}
/** Alias lookup keyed by durable normalized label, spanning names and aliases. */
export function seedAliasIndex(seed = SEED_CONCEPTS) {
    const index = new Map();
    for (const concept of seed) {
        for (const label of [concept.name, concept.slug, ...(concept.aliases ?? [])]) {
            const key = normalizeTopicLabel(label);
            if (key && !index.has(key))
                index.set(key, concept.slug);
        }
    }
    return index;
}
