---
title: DS011-validation-documentation
summary: Defines executable evidence and synchronized documentation.
---

## Introduction

This specification defines executable evidence and synchronized documentation for [sdlm](../wiki.html#definition-sdlm).

## Core Content

Behavioral changes must include meaningful regression coverage for the affected contract and failure boundary. Both the bundled and pinned external backend must pass the full suite. CLI examples must expose expected and observed results on both backends. SDK, HTTP and stdin tests must exercise actual entry points.

Interactive CLI changes must also be exercised through a real pseudo-terminal, including visible typing before Enter, editing, multiline paste, unfinished input, and terminal restoration. Pipe-based tests alone do not establish interactive correctness. The POSIX pseudo-terminal regression uses Python 3; environments without POSIX terminals or Python must report that check as skipped.

README onboarding, HTML guides, the current HTML book and normative specifications must agree with executable behavior. Commands and example catalogs must be generated from their runtime definitions. Documentation builds must record an inventory and source fingerprint, and a check must fail when committed output is stale. Internal links, anchors, shared navigation, specification targets and the documentation map must remain valid.

DS numbering must be contiguous with [DS000](../specsLoader.html?spec=DS000-vision.md) vision, [DS001](../specsLoader.html?spec=DS001-coding-style.md) coding style and [DS003](../specsLoader.html?spec=DS003-main-behavior.md) main behavior reserved. Each DS must contain exactly title and summary frontmatter, and Introduction and Core Content sections. The matrix must be generated with Name and Description columns. Project terminology belongs in the canonical Wiki.

The HTML book must retain substantive research exposition and include the current operational chapters. Historical DOCX and versioned audit artifacts must be labeled archival. Current validation claims must reference repeatable commands or recorded successful checks, never stale historical counts. Evidence limits and missing product capabilities must remain explicit because users rely on them to assess usefulness.

The complete check must execute the fixed evaluation split on both backends. Recorded [benchmark](../wiki.html#definition-benchmark) evidence must identify its split, dataset hash, runtime source hash, actual backend, correct answers, interpreted inputs and incorrect assertions. The source fingerprint must include the versioned corpus. The book must incorporate the [elementary knowledge](../wiki.html#definition-base-knowledge), evaluation and response-style guides without duplicating manually maintained copies.
