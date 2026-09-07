---
title: DS008-sessions
summary: Defines isolation, revision publication, history matching and saved values.
---

## Introduction

This specification defines isolation, revision publication, history matching and saved values for [sdlm](../wiki.html#definition-sdlm).

## Core Content

A named [session](../wiki.html#definition-session) must isolate knowledge, learned competence and [reusable values](../wiki.html#definition-value-reference) from other [sessions](../wiki.html#definition-session). IDs must contain 1 to 64 ASCII letters, digits, underscores or hyphens. Creating an existing ID must fail. A [session](../wiki.html#definition-session) fork must copy current competence and state into a new ID with a fresh conversation.

A successful mutation must publish a complete SOP revision before atomically replacing the [session](../wiki.html#definition-session) record pointer. Failure before pointer replacement must preserve the previous committed revision. Writers must serialize in-process and coordinate separate processes through a filesystem lease. The store may prune revisions older than the current and immediately previous revision after commit. Local atomic rename does not guarantee power-loss durability or distributed filesystem semantics.

Continuation must restore SOP knowledge, installed [circuits](../wiki.html#definition-semantic-circuit) and values without reparsing past language input. Rebuilding indexes and derived closure is permitted. Runtime base-library upgrades can affect restored behavior and are not version-isolated by the [snapshot](../wiki.html#definition-snapshot). Retraction must survive [bootstrap](../wiki.html#definition-bootstrap) execution during restoration.

History matching must accept one new user message, or an unchanged complete or retained history prefix plus a new suffix. A mismatch must fail before execution. The record must retain a rolling history digest and total count while limiting displayed conversation to 200 messages. An explicitly supplied stale revision must return a conflict.

Saved values must be JSON-compatible data represented as SOP constructors. Dot-separated references must access only existing own properties without evaluating expressions. Up to 200 named values may be retained. [Session](../wiki.html#definition-session) response metadata must identify the actual committed revision. Multiuser authorization, power-loss durability and distributed scheduling are outside this store's contract.

[Session](../wiki.html#definition-session) state must include `SessionInterpretation.sop` with [assumptions](../wiki.html#definition-assumption), independent assertion support, rejected decisions, feedback and saved-value dependencies. Rejection must survive restart and invalidate dependent value lookup, including values created through explicit references. Historical value contents may remain inspectable. [DS013](../specsLoader.html?spec=DS013-assumption-guided-interpretation.md) owns evidence and correction.

[Session](../wiki.html#definition-session) settings must persist in `SessionSettings.sop`, independently per [session](../wiki.html#definition-session). Old packs without settings use SOP defaults. Restored knowledge remains authoritative, including when a [snapshot](../wiki.html#definition-snapshot) predates added foundation [circuits](../wiki.html#definition-semantic-circuit). New [sessions](../wiki.html#definition-session) [bootstrap](../wiki.html#definition-bootstrap) the installed [base knowledge](../wiki.html#definition-base-knowledge). Automatic historical-knowledge migration is outside this contract.

CLI selection and command-recall metadata must remain separate from the semantic [session](../wiki.html#definition-session) record and API history digest. Writing terminal history must not create a semantic revision or replay prior input. DS009 defines automatic interactive selection, input recall and its bounds.

The [current speaker](../wiki.html#definition-current-speaker) and introduction evidence must persist as ordinary knowledge and interpretation [snapshots](../wiki.html#definition-snapshot). History matching must not replay an introduction. A separately created [session](../wiki.html#definition-session) must not inherit the speaker. [DS017](../specsLoader.html?spec=DS017-conversational-interaction.md) defines the identity convention and its correction behavior.
