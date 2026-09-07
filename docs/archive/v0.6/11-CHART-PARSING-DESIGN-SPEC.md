# Design Specification 11: Compositional Chart Parsing

## Objective

The chart parser provides a general compositional fallback so grammar coverage does not require one full-sentence circuit for every sentence length and conjunction count.

## Grammar representation

Grammar productions are installed as typed data. RHS symbols are values with either:

```text
{ kind: "terminal", value: "if" }
{ kind: "category", value: "Atom" }
```

SOP circuits construct them through `grammarToken` and `grammarCategory` and install rules through `addGrammarRule`.

## Span closure

For every token position `i`, the parser seeds terminal and lexical-category spans. Each grammar rule is compiled to a Datalog rule over span boundaries. A production

```text
A -> B C
```

corresponds conceptually to:

```text
span(i,k,category,A) :-
    span(i,j,category,B),
    span(j,k,category,C).
```

Datalog evaluation computes the span closure.

## Parse reconstruction

After closure, `src/parsing/chart-parser.mjs` reconstructs trees for the requested root category. It enumerates compatible partitions recursively, memoizes subtree results, sorts by grammar weight/depth, and enforces configured limits.

The current implementation reconstructs bounded trees rather than carrying one maximally packed shared forest through all semantic stages. This is a known scaling opportunity.

## Recursive condition lists

Recursive grammar rules such as `ConditionList -> ConditionList and Atom` allow arbitrary-length conjunctions without fixed `N` parser families. Semantic circuits mirror this recursion by interpreting the list tree recursively.

## Ambiguity

`chartParseAll` returns several trees when available. `resolveParseForest` combines tree scores with semantic-circuit candidate scores, maintains a bounded beam, runs safe branches, deduplicates equal meanings, and emits explicit ambiguity when top distinct results are too close.

## Correctness requirements

The parser must preserve span boundaries, use only installed typed grammar rules, terminate under configured limits, and avoid silently discarding semantically distinct high-ranked parses before the ambiguity policy can evaluate them.
