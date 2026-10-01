// The cold-start ontology: a small, opinionated, three-tier polyhierarchy an
// application can boot from before it has any community proposals. Levels
// follow the navigator contract — area (higher-level concepts), focus (peer
// bands under an area), topic (specific) — and the chooser derives broader,
// peer, and narrower views from the same edges.
import type { TopicConcept, TopicLevel, TopicSnapshot } from './navigator.js'
import { normalizeTopicLabel } from './normalization.js'

export type SeedConcept = {
  slug: string
  name: string
  level: TopicLevel
  summary: string
  parents?: string[]
  aliases?: string[]
  emoji?: string
}

export const SEED_VERSION = 3

/* eslint-disable max-len */
export const SEED_CONCEPTS: SeedConcept[] = [
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
  { slug: 'social-media', name: 'Social media', level: 'topic', summary: 'Feeds, follows, and their discontents.', parents: ['internet-web', 'society'], aliases: ['social network', 'social networks', 'tweet', 'tweets', 'Twitter', 'X.com'] },
  { slug: 'vibe-coding', name: 'Vibe coding', level: 'topic', summary: 'Building software by prompting an AI and steering what it produces.', parents: ['artificial-intelligence', 'software-engineering'], aliases: ['vibe code', 'vibe-coded', 'AI coding', 'coding with AI'] },
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

  // ---- places of service (promoted from the Facts crosswalk gap report, 2026-09-03) ----
  { slug: 'legal-services', name: 'Legal services', level: 'focus', summary: 'Lawyers, law firms, and the hourly rate.', parents: ['business', 'society'], aliases: ['lawyers', 'law firms', 'attorneys'] },
  { slug: 'financial-services', name: 'Financial services', level: 'focus', summary: 'Banks, credit unions, and everyone holding your money.', parents: ['business', 'economy'], aliases: ['banks', 'banking', 'credit unions'] },
  { slug: 'retail', name: 'Retail & shopping', level: 'focus', summary: 'Stores, checkout lines, and return policies.', parents: ['business', 'everyday-life'], aliases: ['shopping', 'stores', 'shops'] },
  { slug: 'real-estate', name: 'Real estate', level: 'focus', summary: 'Buying, selling, and renting the roof over your head.', parents: ['housing', 'business'], aliases: ['realtors', 'property', 'real estate agents'] },
  { slug: 'home-services', name: 'Home services', level: 'focus', summary: 'Plumbers, electricians, contractors, and the window they gave you.', parents: ['housing', 'everyday-life'], aliases: ['contractors', 'plumbers', 'home repair', 'trades'] },
  { slug: 'automotive-services', name: 'Automotive services', level: 'focus', summary: 'Mechanics, body shops, and the estimate that grew.', parents: ['transportation', 'everyday-life'], aliases: ['car repair', 'mechanics', 'auto shops'] },
  { slug: 'personal-care', name: 'Personal care', level: 'focus', summary: 'Salons, barbers, spas, and the haircut you did not ask for.', parents: ['everyday-life', 'health'], aliases: ['salons', 'barbers', 'beauty services', 'spas'] },
  { slug: 'bars-nightlife', name: 'Bars & nightlife', level: 'focus', summary: 'Drinks, music, and the tab at the end.', parents: ['food', 'culture'], aliases: ['bars', 'pubs', 'nightclubs', 'nightlife'] },
  { slug: 'lodging', name: 'Lodging', level: 'focus', summary: 'Hotels, motels, and the room that faced the highway.', parents: ['places'], aliases: ['hotels', 'motels', 'inns', 'hospitality'] },
  { slug: 'places-of-worship', name: 'Places of worship', level: 'focus', summary: 'Churches, temples, mosques, and synagogues as places you go.', parents: ['society', 'culture'], aliases: ['churches', 'temples', 'mosques', 'synagogues', 'congregations'] },
  { slug: 'nonprofits', name: 'Nonprofits & civic organizations', level: 'focus', summary: 'Charities, NGOs, and community groups doing the work.', parents: ['society'], aliases: ['charities', 'ngos', 'civic organizations', 'community organizations'] },

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

  // ---- personal practices and experiences ----
  // These describe things people do, independently of the industries or
  // institutions associated with them. Existing institutional concepts stay
  // distinct; applications choose the appropriate view of this shared graph.
  { slug: 'writing', name: 'Writing', level: 'focus', summary: 'Expressing thoughts, feelings, memories, and imagined worlds in your own words.', parents: ['culture', 'everyday-life'], aliases: ['write', 'creative writing', 'personal writing'] },
  { slug: 'poetry', name: 'Poetry', level: 'topic', summary: 'Making and reading poems: language shaped by sound, rhythm, imagery, and feeling.', parents: ['writing', 'books'], aliases: ['poem', 'poems', 'writing poetry'] },
  { slug: 'journaling', name: 'Journaling', level: 'topic', summary: 'Keeping a personal record of your days, thoughts, experiences, and feelings.', parents: ['writing', 'reflection'], aliases: ['journalling', 'diary', 'diaries', 'personal journal', 'keeping a diary', 'journal writing'] },
  { slug: 'letter-writing', name: 'Letter writing', level: 'topic', summary: 'Writing personal letters and messages to another person in your own words.', parents: ['writing', 'relationships'], aliases: ['writing letters', 'handwritten letters', 'personal correspondence'] },
  { slug: 'storytelling', name: 'Storytelling', level: 'topic', summary: 'Telling or writing stories from memory and imagination, alone or with others.', parents: ['writing', 'relationships'], aliases: ['telling stories', 'story telling'] },
  { slug: 'reading', name: 'Reading', level: 'topic', summary: 'Spending time with written words and making your own meaning from them.', parents: ['books', 'everyday-life'], aliases: ['read', 'reading books', 'reading a book'] },
  { slug: 'visual-arts', name: 'Visual arts', level: 'focus', summary: 'Expressing and exploring through images, shapes, colors, and materials.', parents: ['culture'] },
  { slug: 'drawing', name: 'Drawing', level: 'topic', summary: 'Making marks, sketches, and images by hand from observation or imagination.', parents: ['visual-arts'], aliases: ['draw', 'sketching', 'sketch'] },
  { slug: 'painting', name: 'Painting', level: 'topic', summary: 'Making pictures and exploring color with paint.', parents: ['visual-arts'], aliases: ['paint', 'watercolor', 'watercolour'] },
  { slug: 'photography', name: 'Photography', level: 'topic', summary: 'Looking closely and making photographs of the world as you see it.', parents: ['visual-arts'], aliases: ['taking photos', 'taking photographs'] },
  { slug: 'crafts', name: 'Crafts & making', level: 'focus', summary: 'Making useful or beautiful things with your hands and learning from the materials.', parents: ['culture', 'everyday-life'], aliases: ['crafting', 'handicrafts', 'handmade crafts'] },
  { slug: 'pottery', name: 'Pottery', level: 'topic', summary: 'Shaping clay into objects by hand and on the wheel.', parents: ['crafts', 'visual-arts'], aliases: ['ceramics'] },
  { slug: 'needlework', name: 'Needlework', level: 'topic', summary: 'Knitting, sewing, crocheting, and stitching with thread and yarn.', parents: ['crafts'], aliases: ['knitting', 'sewing', 'crochet', 'embroidery'] },
  { slug: 'woodworking', name: 'Woodworking', level: 'topic', summary: 'Shaping, joining, and finishing wood with your own hands.', parents: ['crafts'], aliases: ['woodcraft'] },
  { slug: 'singing', name: 'Singing', level: 'topic', summary: 'Making music with your own voice, alone or with other people.', parents: ['music'], aliases: ['sing', 'sang', 'choir singing', 'karaoke'] },
  { slug: 'playing-instruments', name: 'Playing instruments', level: 'topic', summary: 'Making music, practicing, and improvising with a musical instrument.', parents: ['music'], aliases: ['playing music', 'making music', 'playing an instrument'] },
  { slug: 'dancing', name: 'Dancing', level: 'topic', summary: 'Moving your body in rhythm for expression, pleasure, or connection.', parents: ['culture', 'fitness'], aliases: ['dance'] },
  { slug: 'live-music', name: 'Live music', level: 'topic', summary: 'Being present with people performing and listening to music together.', parents: ['music'], aliases: ['concerts', 'going to concerts'] },
  { slug: 'relationships', name: 'Relationships', level: 'focus', summary: 'Knowing, loving, listening to, and being present with other people.', parents: ['society', 'everyday-life'], aliases: ['personal relationships'] },
  { slug: 'friendship', name: 'Friendship', level: 'topic', summary: 'Making time for friends and building companionship through shared life.', parents: ['relationships'], aliases: ['friends', 'friendships'] },
  { slug: 'conversation', name: 'Conversation', level: 'topic', summary: 'Talking and listening to one another with attention and curiosity.', parents: ['relationships'], aliases: ['conversations', 'chatting'] },
  { slug: 'marriage', name: 'Marriage', level: 'topic', summary: 'Choosing a shared life, making promises, and caring for a partnership.', parents: ['relationships'], aliases: ['marrying', 'getting married', 'wedding', 'weddings'] },
  { slug: 'parenting', name: 'Parenting', level: 'topic', summary: 'Raising and caring for children as they discover the world.', parents: ['relationships'], aliases: ['raising children', 'raising kids'] },
  { slug: 'celebrations', name: 'Celebrations', level: 'topic', summary: 'Marking meaningful moments with rituals, gatherings, and shared joy.', parents: ['relationships', 'culture'], aliases: ['celebrating', 'birthday celebrations'] },
  { slug: 'volunteering', name: 'Volunteering', level: 'topic', summary: 'Giving your time and practical help to people and causes you care about.', parents: ['relationships', 'society'], aliases: ['volunteer', 'community service'] },
  { slug: 'reflection', name: 'Reflection', level: 'focus', summary: 'Making room to notice your inner life, consider experiences, and find meaning.', parents: ['everyday-life', 'health'], aliases: ['self-reflection', 'personal reflection'] },
  { slug: 'meditation', name: 'Meditation', level: 'topic', summary: 'Practicing attention and awareness through stillness, breath, or movement.', parents: ['reflection', 'mental-health'], aliases: ['meditating', 'mindfulness'] },
  { slug: 'rest', name: 'Rest', level: 'topic', summary: 'Pausing, sleeping, and giving yourself time to recover without a task to finish.', parents: ['reflection', 'health'], aliases: ['resting', 'relaxation'] },
  { slug: 'learning', name: 'Learning', level: 'focus', summary: 'Following curiosity, practicing skills, and learning through your own experience.', parents: ['everyday-life'], aliases: ['learning by doing', 'learning a skill'] },
  { slug: 'language-learning', name: 'Learning languages', level: 'topic', summary: 'Learning to understand and speak another language through practice and conversation.', parents: ['learning'], aliases: ['language learning', 'learning a language'] },
  { slug: 'nature', name: 'Time in nature', level: 'focus', summary: 'Experiencing the outdoors and noticing landscapes, plants, wildlife, and the changing light.', parents: ['places', 'everyday-life'], aliases: ['nature', 'being outdoors', 'outdoor experiences'] },
  { slug: 'walking', name: 'Walking', level: 'topic', summary: 'Going on foot for pleasure, movement, company, and discovery.', parents: ['nature', 'fitness'], aliases: ['walk', 'strolling', 'taking a walk'] },
  { slug: 'hiking', name: 'Hiking', level: 'topic', summary: 'Following trails through the outdoors and experiencing a landscape at your own pace.', parents: ['nature', 'fitness'], aliases: ['hike', 'trekking'] },
  { slug: 'camping', name: 'Camping', level: 'topic', summary: 'Spending the night outdoors and making a temporary home in nature.', parents: ['nature'], aliases: ['camp', 'camping outdoors'] },
  { slug: 'gardening', name: 'Gardening', level: 'topic', summary: 'Growing and tending plants with attention to soil, seasons, and living things.', parents: ['nature', 'everyday-life'], aliases: ['garden', 'growing plants'] },
  { slug: 'birdwatching', name: 'Birdwatching', level: 'topic', summary: 'Watching and listening to birds in their surroundings.', parents: ['nature'], aliases: ['birding', 'bird watching'] },
  { slug: 'stargazing', name: 'Stargazing', level: 'topic', summary: 'Looking at the night sky and noticing stars, planets, and constellations.', parents: ['nature', 'space'], aliases: ['star gazing'] },
  { slug: 'sightseeing', name: 'Sightseeing', level: 'topic', summary: 'Visiting and looking closely at places, landmarks, and local sights.', parents: ['places'], aliases: ['seeing sights', 'visiting sights'] },
  { slug: 'swimming', name: 'Swimming', level: 'topic', summary: 'Moving through water for pleasure, play, or exercise.', parents: ['fitness', 'sports'], aliases: ['swim'] },
  { slug: 'running', name: 'Running', level: 'topic', summary: 'Moving on foot at your own pace for exercise, play, and pleasure.', parents: ['fitness', 'sports'], aliases: ['jogging', 'going for a run'] },
  { slug: 'cycling', name: 'Cycling', level: 'topic', summary: 'Riding a bicycle for movement, exploration, transport, or pleasure.', parents: ['fitness', 'transportation'], aliases: ['bicycling', 'biking', 'riding a bicycle'] },
  { slug: 'yoga', name: 'Yoga', level: 'topic', summary: 'Practicing postures, breath, and attention with your body.', parents: ['fitness', 'reflection'] },
  { slug: 'play', name: 'Play', level: 'focus', summary: 'Doing things for enjoyment, curiosity, imagination, and the pleasure of being together.', parents: ['everyday-life', 'culture'], aliases: ['playing', 'playfulness'] },
  { slug: 'board-games', name: 'Board games', level: 'topic', summary: 'Playing games around a table with other people.', parents: ['play'], aliases: ['tabletop games', 'playing board games'] },
  { slug: 'puzzles', name: 'Puzzles', level: 'topic', summary: 'Enjoying a problem, pattern, or puzzle and finding your own way through it.', parents: ['play'], aliases: ['jigsaw puzzles', 'crosswords'] },
  { slug: 'baking', name: 'Baking', level: 'topic', summary: 'Making bread, cakes, pastries, and other baked food by hand.', parents: ['cooking'], aliases: ['bake', 'baking bread'] },
  { slug: 'sharing-meals', name: 'Sharing meals', level: 'topic', summary: 'Gathering around food and giving one another time and attention.', parents: ['food', 'relationships'], aliases: ['eating together', 'shared meals'] },

]
/* eslint-enable max-len */

export type SeedSnapshotOptions = {
  versionId?: string
  version?: number
}

/**
 * Materialize the seed as an immutable navigator snapshot. Concept ids are
 * their slugs, `childIds` derive from declared parents (in seed order), and
 * `primaryPath` follows each concept's first declared parent chain.
 */
export function buildSeedSnapshot(options: SeedSnapshotOptions = {}): TopicSnapshot {
  return buildSnapshot(SEED_CONCEPTS, options)
}

export function buildSnapshot(seed: readonly SeedConcept[], options: SeedSnapshotOptions = {}): TopicSnapshot {
  const bySlug = new Map(seed.map((concept) => [concept.slug, concept]))
  const childIds = new Map<string, string[]>()
  for (const concept of seed) {
    for (const parent of concept.parents ?? []) {
      if (!bySlug.has(parent)) throw new Error(`seed concept ${concept.slug} names unknown parent ${parent}`)
      const children = childIds.get(parent) ?? []
      children.push(concept.slug)
      childIds.set(parent, children)
    }
  }
  const primaryPath = (slug: string): string[] => {
    const path: string[] = []
    let cursor: SeedConcept | undefined = bySlug.get(slug)
    const guard = new Set<string>()
    while (cursor) {
      if (guard.has(cursor.slug)) throw new Error(`seed cycle through ${cursor.slug}`)
      guard.add(cursor.slug)
      path.unshift(cursor.slug)
      cursor = cursor.parents?.[0] ? bySlug.get(cursor.parents[0]) : undefined
    }
    return path
  }
  const concepts: TopicConcept[] = seed.map((concept) => ({
    id: concept.slug,
    slug: concept.slug,
    name: concept.name,
    summary: concept.summary,
    level: concept.level,
    selectable: true,
    parentIds: [...(concept.parents ?? [])],
    childIds: childIds.get(concept.slug) ?? [],
    primaryPath: primaryPath(concept.slug),
  }))
  return {
    versionId: options.versionId ?? `seed-v${options.version ?? SEED_VERSION}`,
    version: options.version ?? SEED_VERSION,
    concepts,
  }
}

/** Alias lookup keyed by durable normalized label, spanning names and aliases. */
export function seedAliasIndex(seed: readonly SeedConcept[] = SEED_CONCEPTS): Map<string, string> {
  const index = new Map<string, string>()
  for (const concept of seed) {
    for (const label of [concept.name, concept.slug, ...(concept.aliases ?? [])]) {
      const key = normalizeTopicLabel(label)
      if (key && !index.has(key)) index.set(key, concept.slug)
    }
  }
  return index
}
