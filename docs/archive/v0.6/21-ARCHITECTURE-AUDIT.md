# Design Specification 21: Architecture Audit and Release Gate

## Audit question

Does ordinary SOP competence require a second ad-hoc semantic language or language-specific host convention in addition to SOP Lang?

## Current checks

The release gate checks that:

- `candidate-selector.mjs` obtains activation behavior from generic primitive metadata rather than a selector-owned linguistic guard list;
- effect classification comes from primitive metadata and circuit composition;
- grammar RHS values are structured typed symbols;
- natural-language atom realization is implemented through SOP circuits and generic text primitives;
- semantic dimensions such as modality are stored in explicit fields rather than packed predicate strings;
- representative English vocabulary/domain predicates are absent from the trusted kernel;
- the complete functional suite still passes after architecture checks.

## Accepted boundaries

The VM has a small structural ABI for expansion/candidate calls/transactions. Established external formalisms may be wrapped by primitives. Internal IR, Datalog rules, indexes, regular expressions, and backend objects are accepted implementation representations.

## Release status

The bundled-backend test suite passes 32/32. Source syntax checks pass. The external Datalog backend cannot be claimed as verified in this build because external package installation was unavailable.

## Permanent rule

> New competence should normally be represented by SOP circuits and typed values. Any new host-level syntax, delimiter convention, placeholder grammar, privileged selector vocabulary, or semantic packing must be treated as an architecture defect unless it is an explicitly justified backend/formalism boundary.
