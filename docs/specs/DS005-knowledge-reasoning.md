---
title: DS005-knowledge-reasoning
summary: Defines assertions, safe rules, contradictions, proofs and retraction.
---

## Introduction

This specification defines assertions, safe rules, contradictions, [proofs](../wiki.html#definition-proof) and retraction for [sdlm](../wiki.html#definition-sdlm).

## Core Content

The [knowledge base](../wiki.html#definition-knowledge-base) must accept nonempty unary and binary [atoms](../wiki.html#definition-atom) with explicit positive or negative polarity and optional [qualifiers](../wiki.html#definition-qualifier). Ground facts must contain constants. Every rule head variable must be bound by the body, and a rule body must be nonempty. Invalid inputs must fail before mutation on both supported backends. Undefined tuples are invalid. Repeated identical rules may be treated idempotently.

Positive and explicit negative support must remain independent, yielding supported, refuted, both or unknown query results. Missing support must not become negation by default. Modal [qualifiers](../wiki.html#definition-qualifier) must remain part of relation identity. Supported tense normalization does not create temporal truth conditions.

Retraction must remove matching asserted facts or rules and recompute derived closure. A conclusion with remaining independent support must remain available. [Proof](../wiki.html#definition-proof) explanations may reconstruct support from current facts and rules with a depth bound of 40. They must not claim stored source witnesses or complete [provenance](../wiki.html#definition-proof) where only a derived marker is available.

The bundled and external [Datalog](../wiki.html#definition-datalog) evaluators must pass the shared behavioral suite. Explicit external selection must fail when unavailable. Automatic fallback is limited to absence of the external package itself. Source-aware incremental truth maintenance and persisted derivation witnesses are outside the implemented boundary.
