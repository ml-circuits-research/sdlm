---
title: DS009-cli
summary: Defines interactive inspection, runnable examples and automation.
---

## Introduction

This specification defines interactive inspection, runnable examples and automation for [sdlm](../wiki.html#definition-sdlm).

## Core Content

The CLI must provide `/help` and `/examples`. `/examples N` and `/examples all` must display scenarios without execution or [session](../wiki.html#definition-session) mutation. `/example N` and `/example all` must execute them. Example execution must compare expected and actual results, report PASS or FAIL, and isolate its runtime from the selected user [session](../wiki.html#definition-session). Numeric IDs must remain stable when adding examples.

The command catalog must include knowledge and execution inspection, [circuit](../wiki.html#definition-semantic-circuit) learning and installation, named-session creation and continuation, retraction, saved-value inspection and [circuit](../wiki.html#definition-semantic-circuit) execution. The HTML CLI guide and book chapter must derive command names and example data from the runtime catalogs.

Input lines must execute sequentially. Conversation mode must be the default and expose [assumptions](../wiki.html#definition-assumption) or unresolved partial results for language gaps. `/mode strict` must select exact parsing. Unsupported commands, strict language failures and operational failures must return a failing batch exit status; interactive use may continue. Startup must support backend choice, extensions, session-store location, a named [session](../wiki.html#definition-session), tracing, a file or standard input, and machine-readable example results.

Interactive input must display typed and pasted characters before submission and support line editing and command history. Complete pasted lines must execute in order. Redrawing the prompt after asynchronous execution must preserve any unfinished input already in the editor. Closing the CLI must restore normal terminal input mode. Pipe and file input must remain free of interactive prompts and terminal control sequences.

Temporary [sessions](../wiki.html#definition-session) require an explicit save for persistence. Named [session](../wiki.html#definition-session) mutations must commit before the CLI reports success. `/reset` must create a new durable [session](../wiki.html#definition-session) interactively and select a new temporary runtime in batch use, without deleting saved [sessions](../wiki.html#definition-session).

The CLI must expose `/assumptions`, `/reject <id> [reason]` and `/feedback [new file.json]`. Rejection must persist in a named [session](../wiki.html#definition-session) before success is reported. Feedback export must refuse to overwrite existing files. Mode selection is local to the CLI; durable decisions and corrections belong to the selected [session](../wiki.html#definition-session).

The CLI must expose `/benchmarks [case-id]`, `/benchmark [dev|eval|all]` and `/verbosity [answer|explain]`. Evaluation must use isolated fresh runtimes and exact typed scoring. [Response preferences](../wiki.html#definition-response-style) belong to the selected [session](../wiki.html#definition-session) and must pass through SOP policy. [DS015](../specsLoader.html?spec=DS015-elementary-evaluation.md) and [DS016](../specsLoader.html?spec=DS016-response-style.md) own their detailed contracts.

Interactive startup must restore the last selected durable [session](../wiki.html#definition-session) per store. Without a remembered selection it must select the most recently updated saved [session](../wiki.html#definition-session), or create one if the store is empty. The banner must identify the active [session](../wiki.html#definition-session). `--session` must override selection; `--temporary` must start temporary state without replacing the remembered ID. Batch, file and isolated example execution must not resume the interactive selection implicitly.

Up/Down recall must survive process restarts and follow the selected [session](../wiki.html#definition-session). `/history commands` must display submitted input separately from `/history` conversation messages. Recall must include slash commands and failed attempts, excluding blank lines, comments, `/quit` and entries over 8,192 characters. At most 1,000 entries are retained; consecutive duplicates collapse. Input is saved before its attempted execution and must never replay on restoration.

CLI metadata must use atomic locked writes and remain independent of SOP revisions and API history digests. A [session](../wiki.html#definition-session) with no recall file may seed its history from retained user messages. Forks start with fresh recall. Missing remembered [sessions](../wiki.html#definition-session) may fall back with a notice; corrupt existing semantic state must fail restoration. [Session](../wiki.html#definition-session) creation or switching must succeed before its ID becomes the remembered selection. Concurrent terminals merge submitted history, while the last completed interactive selection determines the next default.

Conversation-mode help must show a usable greeting or introduction, capability guidance, the distinction between displaying and running an example, and the response-detail controls. The numbered conversation scenarios must run in isolated state like the rest of the catalog. [DS017](../specsLoader.html?spec=DS017-conversational-interaction.md) owns conversational semantics.
