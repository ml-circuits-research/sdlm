# Design Specification 15: One-Language Invariant

## Rule

SOP Lang is the author-facing language for composing executable competence. Ordinary parsing, semantic interpretation, reasoning workflows, response planning, realization, and learned extensions should be represented as SOP circuits plus typed data.

## Forbidden architecture patterns

The following patterns are architectural failures unless explicitly justified as a standard external formalism behind a backend boundary:

- selector-owned lists of linguistic/semantic command names with duplicated semantics;
- custom string prefixes that encode grammar symbol type;
- private placeholder/interpolation languages for response semantics;
- delimiters that pack semantic dimensions into predicate identifiers;
- a second authoring syntax for command/circuit definitions;
- language-specific host branches that grow with CNL coverage.

## Allowed implementation forms

The invariant does not prohibit internal representations. ASTs, SSA graphs, typed values, indexes, Datalog programs, regular expressions, SQL, bytecode, SMT, e-graphs, or neural calls are allowed behind explicit primitive/compiler/backend boundaries.

## Current enforcement

`test/no-hidden-dsl.test.mjs` and `test/no-language-hardcoding.test.mjs` enforce representative architecture constraints. Runtime tests additionally verify typed grammar RHS structures and circuit-based atom realization.

The tests should be extended whenever a new class of hidden authoring semantics is discovered.

## Primitive rule

New primitives are acceptable only for generic capabilities that cannot be cleanly composed from existing primitives at the required performance or semantic boundary. Primitive metadata must live with the primitive definition so selector/effect systems do not duplicate semantic registries.
