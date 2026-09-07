---
title: DS010-api
summary: Defines text compatibility and explicit session and circuit extensions.
---

## Introduction

This specification defines text compatibility and explicit [session](../wiki.html#definition-session) and [circuit](../wiki.html#definition-semantic-circuit) extensions for [sdlm](../wiki.html#definition-sdlm).

## Core Content

The server must expose Models and text Chat Completions envelopes with model ID `sdlm`. It must reject unsupported parameters rather than silently simulate tools, multimodal inputs, embeddings, Responses API or sampling. Text roles are user, assistant, system and developer; assistant text must not assert knowledge. System and developer text has the same [controlled-language](../wiki.html#definition-cnl) interpretation boundary as other context input.

Stateless requests must use a fresh runtime. Named requests must select one existing [session](../wiki.html#definition-session) through consistent ID references. The first-message `sdlm_session` content part may reference a [session](../wiki.html#definition-session) and revision and must be removed before language parsing. Responses must expose the committed ID, revision, ignored history count, executed input count and reusable results under `sdlm`. The extension is additional to the standard response envelope.

New input lines in one request must execute atomically. Conversation mode may commit useful sentences together with unresolved language results, while operational errors roll back the request. At most 4,096 history messages, 128 new lines, 128 conversation sentences and 1 MiB of JSON may be accepted. Text substitutions must use explicit scalar bindings; structured [circuit](../wiki.html#definition-semantic-circuit) inputs may use `$ref`. Unknown references must fail. A client-supplied revision must prevent stale execution, but requests without revisions are not idempotent.

Streaming must emit standard SSE chunk envelopes and `[DONE]` only after execution and durable commit. Usage counts must be identified as SOP tokenizer counts. The server must implement the documented error envelope and reject excess pending capacity. A non-loopback server must require a bearer token; the token grants workspace-wide access and is not per-user isolation.

Agent pack, learning, run, values, and forget routes are explicit [sdlm](../wiki.html#definition-sdlm) extensions. Their names and payloads are owned by the API guide and source. Compatibility must be tested using the official SDK against the local server without an external API call.

Chat must default to `interpretation: "assist"` and accept `"strict"` for exact execution. Both stateless and named completions must expose structured results and [assumptions](../wiki.html#definition-assumption) under `sdlm`. [Session](../wiki.html#definition-session) [assumption](../wiki.html#definition-assumption) inspection and rejection routes must expose evidence, corrective retraction, invalidated values and the committed revision. Unsupported protocol options remain errors. [DS013](../specsLoader.html?spec=DS013-assumption-guided-interpretation.md) owns the interpretation contract.

Conversation requests may set `verbosity` to `answer` or `explain`. The adapter must invoke the same SOP policy used by input instructions and the CLI. Responses must preserve structured evidence and expose preferences under `sdlm`; compact mode changes message text. Strict interpretation with an explicit [verbosity](../wiki.html#definition-response-style) parameter must fail validation. [DS016](../specsLoader.html?spec=DS016-response-style.md) defines precedence, persistence and formatting.
