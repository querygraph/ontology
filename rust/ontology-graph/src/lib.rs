//! Project the shared ontology into a Grust property graph. The graph shape
//! is the shared machinery; the data inside it is always one application's
//! own. Backends stay app-owned: build the `grust::Graph` here, persist or
//! traverse it with whichever GraphStore the application chooses.

use grust::prelude::*;
use ontology_core::Concept;

pub const CONCEPT_LABEL: &str = "concept";
pub const WITHIN_LABEL: &str = "within";
pub const ABOUT_LABEL: &str = "about";

/// An application content item labeled with ontology concepts (a gripe, a
/// talk, an article — whatever the app's subjects are).
#[derive(Debug, Clone)]
pub struct LabeledContent {
    pub id: String,
    pub kind: String,
    pub name: String,
    pub concept_slugs: Vec<String>,
}

/// Build the concept polyhierarchy as a graph: `concept` nodes and `within`
/// edges from parent to child.
pub fn concept_graph(concepts: &[Concept]) -> Graph {
    let mut builder = GraphBuilder::new();
    add_concepts(&mut builder, concepts);
    builder.build()
}

/// Build the concept graph plus one application's labeled content:
/// `<kind>` nodes joined to concepts by `about` edges.
pub fn labeled_graph(concepts: &[Concept], content: &[LabeledContent]) -> Graph {
    let mut builder = GraphBuilder::new();
    add_concepts(&mut builder, concepts);
    let known: std::collections::BTreeSet<&str> =
        concepts.iter().map(|concept| concept.slug.as_str()).collect();
    for item in content {
        let _ = builder
            .node(item.kind.clone(), item.id.clone())
            .prop("name", item.name.clone())
            .finish();
        for slug in &item.concept_slugs {
            if known.contains(slug.as_str()) {
                let _ = builder
                    .edge(ABOUT_LABEL, item.id.clone(), slug.clone())
                    .finish();
            }
        }
    }
    builder.build()
}

fn add_concepts(builder: &mut GraphBuilder, concepts: &[Concept]) {
    for concept in concepts {
        let _ = builder
            .node(CONCEPT_LABEL, concept.slug.clone())
            .prop("name", concept.name.clone())
            .prop("level", concept.level.clone())
            .prop("summary", concept.summary.clone())
            .finish();
    }
    for concept in concepts {
        for parent in &concept.parent_slugs {
            let _ = builder
                .edge(WITHIN_LABEL, parent.clone(), concept.slug.clone())
                .finish();
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use ontology_core::build_seed_snapshot;

    #[test]
    fn the_seed_projects_into_a_graph() {
        let snapshot = build_seed_snapshot();
        let graph = concept_graph(&snapshot);
        assert_eq!(graph.nodes.len(), snapshot.len());
        let edge_count: usize = snapshot.iter().map(|concept| concept.parent_slugs.len()).sum();
        assert_eq!(graph.edges.len(), edge_count);
    }

    #[test]
    fn labeled_content_attaches_by_about_edges() {
        let snapshot = build_seed_snapshot();
        let content = vec![LabeledContent {
            id: "gripe-1".into(),
            kind: "gripe".into(),
            name: "The feed is all slop".into(),
            concept_slugs: vec!["ai-slop".into(), "not-a-concept".into()],
        }];
        let graph = labeled_graph(&snapshot, &content);
        assert_eq!(graph.nodes.len(), snapshot.len() + 1);
        let about_edges = graph
            .edges
            .iter()
            .filter(|edge| edge.label.as_str() == ABOUT_LABEL)
            .count();
        assert_eq!(about_edges, 1, "unknown concepts are skipped");
    }
}
