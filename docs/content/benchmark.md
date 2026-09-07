# Elementary evaluation

The early-school benchmark evaluates 88 authored English questions across eleven elementary domains. Each case supplies context, a question and an exact typed expectation. The dataset is available at [v1.json](assets/benchmarks/v1.json) and is separate from the runtime's knowledge. Ordinary replies never read expected benchmark answers.

## Run and inspect

```text
/benchmarks
/benchmarks animals-01
/benchmark dev
/benchmark eval
/benchmark all
```

```sh
npm run benchmark -- --split eval
npm run benchmark -- --split all --backend external --output /tmp/sdlm-evaluation.json
npm run benchmark -- --split all --no-foundation --output /tmp/sdlm-ablation.json
```

Each case runs in a fresh isolated runtime. It does not change your selected CLI session and does not load learned packs. Progress appears after every ten cases. The report includes expected and actual values, assumptions, incorrect assertions, understood inputs, backend, corpus hash and runtime source hash. A failed expectation makes the command return a failing exit status, including an intentional ablation with `--no-foundation`.

## Corpus design and scoring

There are eight cases per domain: four development cases and four evaluation cases, giving 44 cases in each split. Domains cover animals, plants and materials, senses and tools, arithmetic, quantities, space, order and calendar, family, everyday causes, comparisons and evidence boundaries. The question set and expectations were written before adding the elementary circuits. The evaluation split is a reserved regression set from the same author; it is not an independent blind test.

A supported Yes, No, Both or Unknown must match the expected boolean status exactly. Numbers must match exactly. Binding lists must contain exactly the expected values, independent of order. A parser failure does not count as a correct Unknown. Reports separately count wrong asserted answers so a system that guesses incorrectly is distinguishable from one that cannot interpret the input. Regression tests outside the corpus also exercise new names and arithmetic operands, movement, negative inventory updates, conditional defaults and session isolation.

Topic selection uses the early primary coverage in the [English mathematics curriculum](https://www.gov.uk/government/publications/national-curriculum-in-england-mathematics-programmes-of-study/national-curriculum-in-england-mathematics-programmes-of-study) and [science curriculum](https://www.gov.uk/government/publications/national-curriculum-in-england-science-programmes-of-study/national-curriculum-in-england-science-programmes-of-study), alongside authored everyday reasoning cases. The sources guide topic choice; they do not validate these questions as an age-standardized instrument. A score does not establish equivalence to a seven-year-old child, general intelligence or broad language comprehension.

The fixed school corpus does not cover every arithmetic paraphrase or spelling error. In particular, an earlier 88/88 score coexisted with failure on `how much is 3 plus 5?`. The separate `arithmetic-conversation.test.mjs` regression set and example 23 exercise request variants, new operands, lexical repair, rejection and incomplete calculations. These checks extend measured input coverage without changing the frozen dataset.

## Recorded measurements

{{BENCHMARK}}

The baseline was measured before adding elementary knowledge and quantity circuits. Its original report records a corpus hash but no source fingerprint. The complete final reports record both hashes and can be compared case by case. Development and evaluation use the same fixed expectations across runs. Changes to expectations require a new dataset version and an explanation, rather than silently repairing a failing score.

## Improve a failure

Inspect its context, actual answer and assumptions. Reproduce it with `/verbosity explain` and inspect `/parse`, `/kb`, `/assumptions` and `/trace last`. Decide whether the missing piece is vocabulary, a construction, a domain rule, a state update or a mistaken default. Add or correct the corresponding SOP circuit, add regression cases with changed names and values, and repeat both splits and both backends. Use the [learning guide](learning.html) for validated packs and the [foundation guide](foundation.html) for source ownership.

This corpus deliberately uses supported sentence patterns. Unseen paraphrases, pronouns, rich narratives, units and event timelines require separate evaluations. A perfect score here is evidence for this finite corpus only.
