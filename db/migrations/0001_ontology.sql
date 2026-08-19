-- Shared ontology machinery, never shared data: every application applies
-- this DDL to ITS OWN database and fills it with ITS OWN topics. The shapes
-- are what the algorithms (matching, solicitation/labeling, extraction,
-- navigation) are wired to; the rows never leave the application.

create extension if not exists pgcrypto;

create table if not exists onto_concept (
    id uuid primary key default gen_random_uuid(),
    slug text not null unique
        check (slug = lower(slug) and char_length(slug) between 1 and 80),
    name text not null check (char_length(name) between 1 and 120),
    level text not null check (level in ('area', 'focus', 'topic')),
    summary text check (summary is null or char_length(summary) <= 500),
    emoji text,
    -- null: created by this application; set: shipped by the shared seed.
    seed_version integer,
    created_at timestamptz not null default now()
);

create table if not exists onto_edge (
    parent_id uuid not null references onto_concept(id) on delete cascade,
    child_id uuid not null references onto_concept(id) on delete cascade,
    ordinal integer not null default 0,
    primary key (parent_id, child_id),
    check (parent_id <> child_id)
);

create index if not exists onto_edge_child_idx on onto_edge(child_id);

create table if not exists onto_alias (
    id uuid primary key default gen_random_uuid(),
    concept_id uuid not null references onto_concept(id) on delete cascade,
    label text not null check (char_length(label) between 1 and 120),
    -- Produced ONLY by normalizeTopicLabel / normalize_topic_label. Unique:
    -- the matching machinery may auto-reuse a unique approved alias.
    normalized_label text not null unique,
    status text not null default 'approved'
        check (status in ('approved', 'pending', 'rejected')),
    source text not null default 'seed',
    created_at timestamptz not null default now()
);

create index if not exists onto_alias_concept_idx on onto_alias(concept_id);

-- User topic solicitation: proposals stay outside the visible ontology until
-- an application reviewer maps or approves them (gateTopicProposal is the
-- shared gate; review remains app workflow).
create table if not exists onto_proposal (
    id uuid primary key default gen_random_uuid(),
    label text not null check (char_length(label) between 1 and 120),
    normalized_label text not null,
    definition text check (definition is null or char_length(definition) <= 500),
    parent_id uuid references onto_concept(id) on delete set null,
    -- App-defined subject identifier; the shared schema never references an
    -- application's account tables.
    proposed_by text,
    status text not null default 'pending'
        check (status in ('pending', 'approved', 'mapped', 'rejected')),
    mapped_concept_id uuid references onto_concept(id) on delete set null,
    created_at timestamptz not null default now(),
    decided_at timestamptz
);

create unique index if not exists onto_proposal_pending_label_idx
    on onto_proposal(normalized_label) where status = 'pending';

-- Labeling: which application subjects (gripes, talks, articles — the app
-- names its own kinds) are about which concepts, and on whose authority.
create table if not exists onto_label (
    subject_kind text not null check (char_length(subject_kind) between 1 and 40),
    subject_id text not null check (char_length(subject_id) between 1 and 120),
    concept_id uuid not null references onto_concept(id) on delete cascade,
    source text not null check (source in ('extraction', 'user', 'import', 'seed')),
    confidence real check (confidence is null or (confidence >= 0 and confidence <= 1)),
    created_at timestamptz not null default now(),
    primary key (subject_kind, subject_id, concept_id, source)
);

create index if not exists onto_label_concept_idx on onto_label(concept_id);
