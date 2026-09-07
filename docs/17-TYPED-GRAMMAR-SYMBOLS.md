# Design Specification 17: Typed Grammar Symbols

## Representation

A grammar RHS distinguishes literal terminals from categories through structured values:

```text
{ kind: "terminal", value: "if" }
{ kind: "category", value: "Atom" }
```

`grammarToken` and `grammarCategory` create these values. `addGrammarRule` stores normalized rules in `GrammarStore`.

## Parser contract

`GrammarStore` rejects unknown symbol kinds and empty values. `ChartParser` seeds terminal/category spans explicitly and compiles every grammar rule according to `symbol.kind` and `symbol.value`.

## Learning contract

The circuit inducer emits the same typed constructors when generating grammar installers. Learned rules therefore use exactly the same representation as hand-authored grammar circuits.

## Extension path

Future grammar symbols may carry feature structures, namespace, weights, provenance, or constraints as explicit typed fields. Such fields should be added structurally rather than encoded into names.
