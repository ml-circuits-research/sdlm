# Design Specification 14: Remaining Research Risks

## Semantic representation

Flat atoms and Horn-style rules are only the current low-level materialization substrate. Richer event/time/reference/intensional semantics should be developed as reusable SOP circuit libraries that construct, project, and reason over richer symbolic structures. Competing representations must be tested without moving domain semantics into predicate-string conventions or host code.

## Ranking and ambiguity

Structural weights and hand-assigned scores are insufficient for difficult ambiguity. Learned priors, discourse context, proof quality, computational cost, and failure feedback may be needed while preserving inspectable selection evidence.

## Circuit interaction

Independently valid circuit packs can interfere. The system needs namespaces, compatibility constraints, regression isolation, semantic dependency tracking, and possibly proof obligations for high-trust packs. Where compatibility knowledge is needed, it should itself be expressible through ordinary circuits/typed values rather than a new author-facing manifest language.

## Long-term circuit memory

Loading all circuit bodies eagerly is unsuitable for very large libraries. Compact activation signatures should remain hot while cold bodies stay content-addressed/on disk and load lazily after selection.

## Search explosion

Chart ambiguity, semantic alternatives, and recursive circuit expansion can produce combinatorial growth. Better packed structures, dynamic programming, pruning, learned ranking, and cost-aware budgets are required.

## Learning quality

Surface paraphrase induction is not enough. The critical open question is whether the system can learn abstractions that reduce code, generalize compositionally, and improve held-out tasks rather than only accumulate exceptions.

## Knowledge scale and truth maintenance

Persistent research/domain use requires provenance-aware KB sharding, incremental closure, retraction, supersession, source quality, and efficient dependency invalidation.

## External tools

The current transaction model protects internal state only. Real agents need an explicit effect protocol for deferred commit, compensation, authorization, audit, and policy.

## Hybridization

Neural components may be useful for acquisition, fuzzy matching, ranking, induction, and fluent realization. The research risk is losing symbolic guarantees when hybrid components become runtime authorities. Hybrid interfaces should preserve structured outputs, provenance, validation, and bounded effects.

## Document-to-circuit learning quality

The architecture now accepts document knowledge as generated SOP circuit packs, but the reference pack is hand-authored by the research process rather than produced by an evaluated automatic extractor. The central learning question is therefore whether a coding agent or LLM can generate correct, compact, reusable circuits from arbitrary documents while preserving source coverage, attribution, uncertainty, and useful abstraction. This must be evaluated as circuit synthesis, not hidden behind a separate semantic serialization.

The semantic conventions used inside generated circuits are also intentionally not frozen. Event structure, time, coreference, modality, causality, definitions, and discourse need falsifiable competing circuit libraries and benchmarks.
