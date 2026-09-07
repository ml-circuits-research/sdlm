---
title: DS016-response-style
summary: Defines circuit-controlled response detail with persistent audit evidence.
---

## Introduction

This specification defines user control over visible conversation detail while preserving the evidence needed to inspect and correct answers.

## Core Content

SOP [bootstraps](../wiki.html#definition-bootstrap) must select `explain` as the fresh-session [response style](../wiki.html#definition-response-style). `SetResponseStyle` must accept `answer` and `explain` through SOP choice [circuits](../wiki.html#definition-semantic-circuit). CLI `/verbosity`, the chat `verbosity` parameter and supported complete instruction sentences must use this policy. Lexical instruction forms, response selection, [assumption](../wiki.html#definition-assumption) wording, conditional explanations and unresolved-input wording must live in [circuits](../wiki.html#definition-semantic-circuit). Generic host storage and collection operations must not define domain policy.

Explained presentation must retain base answers, actual [assumptions](../wiki.html#definition-assumption) and their support or refutation, rule-based missing-premise [hypotheses](../wiki.html#definition-hypothesis), and separately identified context [assumptions](../wiki.html#definition-assumption) when [proof](../wiki.html#definition-proof) contribution is incomplete. Compact presentation must select answer text and suppress assertion or preference acknowledgements when the same request contains an answer. Multiple answers retain order. Assertion-only and preference-only requests may confirm the operation. An unresolved compact reply must remain Unknown in meaning and preserve the gap for inspection.

Both styles must preserve structured answers, `answer_text`, full `explanation`, actual [assumptions](../wiki.html#definition-assumption), dependencies and [proof](../wiki.html#definition-proof) data where available. Rejection and saved-value invalidation must work identically regardless of visible style. Compact mode reduces prose only; it does not promise a smaller audit payload or skipped evidence computation.

The response preference must be session-local, transactional and durable as `SessionSettings.sop`. Old packs without settings use the SOP default. A failed request restores its earlier preference. The final selected style within one request formats the whole request. An API [verbosity](../wiki.html#definition-response-style) parameter applies before new input instructions. No separate preference priority is implied by transport roles.

Strict parsing and direct execution bypass conversation presentation. The API must reject strict interpretation combined with an explicit [verbosity](../wiki.html#definition-response-style) parameter. The preference remains available when the caller returns to conversation mode. Supported Romanian control phrases do not establish Romanian semantic coverage.

Read-only [circuit](../wiki.html#definition-semantic-circuit) mapping must check the target's [effects](../wiki.html#definition-effect-analysis) before execution and consume the shared request budget. It must refuse write, external and unknown targets even if selected dynamically. Public preference mutations must use the serialized runtime boundary.
