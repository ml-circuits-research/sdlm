# Design Specification 16: Generic Relational Lowering for Circuit Activation

## Goal

Use Datalog for sparse candidate activation without defining a second guard language inside the selector.

## Primitive metadata interface

A primitive may expose optional `activation` metadata. At circuit-index time, this projection can inspect the node's static arguments and its relationship to circuit inputs. It may emit:

- `requiredKeys`: conservative canonical observations that must exist;
- `test`: optional cheap host predicate over request structure;
- `score` / `weight`: ranking contribution.

The selector treats these outputs generically and never dispatches on linguistic primitive names.

## Observation model

Request structures are converted into canonical observation keys. The observation layer should remain generic over arrays/objects and structural fields. Domain-specific meaning belongs in circuits/primitives, not in the selector.

## Safety

Relational lowering is an **abstract interpretation for activation**, not full semantics. It must be conservative. If a projection cannot be expressed safely, omit it and let the full circuit execute as a candidate.

## Future automatic lowering

Primitive-local projections are a clean current ABI but still manual. A stronger compiler should attempt to derive projections from pure circuit slices mechanically:

1. backward-slice from guards that constrain circuit inputs;
2. classify nodes by purity/effect;
3. abstractly evaluate operations with literal arguments;
4. translate supported relational conditions to Datalog facts/rules;
5. leave unsupported conditions for runtime validation.

The key requirement is that automatic lowering must never become a second authoring language.
