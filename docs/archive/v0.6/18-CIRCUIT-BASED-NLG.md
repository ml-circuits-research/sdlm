# Design Specification 18: Circuit-Based Natural-Language Generation

## Objective

Natural-language realization must remain part of the normal SOP circuit architecture rather than becoming a private renderer language.

## RealizeAtom

`RealizeAtom.sop` performs candidate selection over the atom-realizer circuit group. Realizers inspect structured atom properties and lexical data. Common families include unary positive/negative atoms, binary verbs, relation nouns, and qualified/modal forms.

## Morphology

Surface morphology is lexicon data. `lexemeSurface` retrieves a surface form for a lemma/class such as base, third-person, past, participle, or progressive forms. Realizer circuits use this resource rather than host-language conjugation tables.

## Composition

Generic text primitives (`concat`, `join`, display/lexeme lookup) combine realized units. Higher-level response circuits decide fact selection, ordering, section/prefix text, proof rendering, and ambiguity messages.

## Provenance

The response planner receives structured semantic objects whose facts and proofs are already provenance-aware. A production generator should preserve a claim map from output statements to underlying KB/proof/source objects.

## Open work

The architecture still needs aggregation, referring expressions, richer morphology, lexical choice, discourse planning, style, rhetorical planning, and document-level generation. These should be evaluated as additional circuit layers or constrained backend calls.
