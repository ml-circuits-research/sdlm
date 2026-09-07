---
title: DS001-coding-style
summary: Defines source ownership, coding conventions and validation duties.
---

## Introduction

This specification defines source ownership, coding conventions and validation duties for [sdlm](../wiki.html#definition-sdlm).

## Core Content

Runtime JavaScript must use ES modules and explicit imports. The supported Node.js baseline is 22. Dependencies must be pinned with a committed lockfile. Domain language competence belongs in `circuits/` and `extensions/`; generic execution, protocol and storage mechanisms belong in `src/`.

Source modules should remain below 500 lines. Files above 800 lines require decomposition unless generated data or a complete reference document explains the size. Code lines should normally fit 120 columns. Markdown and HTML prose must use one logical line per paragraph and must not be manually wrapped. Run `bash fileSizesCheck.sh` to inspect size and line-length warnings; generated libraries, book output and lockfiles require contextual review rather than arbitrary splitting.

Tests must live in focused `test/*.test.mjs` modules and verify observable outcomes or meaningful failure boundaries. A behavior change must update the relevant DS, examples where useful, explanatory HTML sources and book material in the same change. `npm run check` must pass before delivery. `npm run docs:build` refreshes generated artifacts and `npm run docs:check` must reject stale output.

JavaScript comments and persistent documentation must use plain English. Host code must not embed a second author-facing linguistic DSL. Errors must preserve actionable context without returning secrets. Public state mutation must enter the serialized [transaction](../wiki.html#definition-transaction) boundary. Imported agent instructions remain in their own folders and must not become product specifications.

Arithmetic, generic functional relation storage, transactional settings and bounded collection operations may be host [primitives](../wiki.html#definition-primitive). Domain categories, state-update sentence forms, default conditions, response modes and explanatory wording must remain [SOP circuits](../wiki.html#definition-semantic-circuit). Dynamic read mapping must verify the selected target is speculatively safe before executing it. [Benchmark](../wiki.html#definition-benchmark) expectations belong to evaluation data and must not become a runtime answer table.
