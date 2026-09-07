# Design Specification 07: Circuit Learning and Scaling

## Learning target

The unit of learned competence is an inspectable SOP circuit or circuit pack plus tests and provenance. Learning should not create an opaque side representation that ordinary runtime tooling cannot inspect.

## Implemented supervised induction

The current learner accepts surface-to-canonical examples, parses canonical forms with the existing system, aligns varying semantic values to surface positions, synthesizes grammar-installation and semantic SOP circuits, writes them to disk, reloads them, and validates that learned surface forms reproduce the target command structures.

The learner is useful for paraphrase/general surface induction. It does not yet discover deep recursive algorithms autonomously.

## Large circuit library

The artifact includes 2,918 specialized micro-circuits inside a total of 3,147 SOP files. Candidate selection uses group partitioning plus activation-signature indexing before Datalog evaluation so only a small candidate subset should be materialized per request.

## Scaling hypothesis

The architecture is viable at larger scales only if ordinary task cost grows primarily with relevant candidates rather than total circuit count. Million-circuit experiments must therefore measure index size, cold-body loading, candidate frontier, Datalog rule count after prefilter, memory, latency, cache hit rate, and interference.

## Quality versus count

A growing library can become brittle even if activation remains fast. Useful learning must decide when to create a narrow expert, compose existing circuits, synthesize a reusable abstraction, consolidate redundant circuits, or reject a change because it causes regressions. The meaningful unit is `new tested behavior with bounded interference`, not `new file`.
