---
title: DS017-conversational-interaction
summary: Defines friendly conversational routing, speaker evidence and useful clarification.
---

## Introduction

CLI and API callers need to start a conversation, identify themselves and ask useful questions without learning the parser's internal categories. This contract covers the circuit-defined conversational layer. The [conversation guide](../conversation.html) provides runnable scenarios.

## Core Content

### Route conversational intent before general parsing

Conversation mode must attempt the read-only `ChatInterpret` [circuit](../wiki.html#definition-semantic-circuit) before general parsing. SOP guards own greetings, introductions, capability questions, person lookups and supported first-person references. Registered category words must retain their predicate-query meaning, so `Who is human?` remains a category query. A matched person lookup must inspect stored facts rather than classify the name as an unfamiliar predicate. Strict parser methods and exact pack acceptance retain their existing behavior.

Conversational proposals must remain speculative until review and execution. SOP may return a typed command or a rewritten input with decisions and supporting [atoms](../wiki.html#definition-atom). The host schedules at most four [rewrite](../wiki.html#definition-rewrite) levels within the request budget. Prefix handling must preserve supplied punctuation and reject an unsupported dependent [rewrite](../wiki.html#definition-rewrite). An embedded copula question must become a question, not an asserted subordinate clause. Full result metadata must retain original input, the executed command, [rewrite](../wiki.html#definition-rewrite) chain, [assumptions](../wiki.html#definition-assumption) and supporting evidence.

### Preserve and correct the current speaker

An introduction must preserve its supplied identity rather than merge a similar known name. Explicit naming forms accept one to four symbolic words. Bare unfamiliar `I am` and `I'm` introductions must record a name-classification [assumption](../wiki.html#definition-assumption); known category and reserved words must not become names through that form. Names use lowercase identifiers joined with underscores and normalized display capitalization.

SOP execution must assert `introduced(name)` and replace the current `conversation_speaker(_conversation, name)` relation. There is one [current speaker](../wiki.html#definition-current-speaker) per [session](../wiki.html#definition-session). Existing assertions about other names remain. Repeating the same value must preserve independent support. The identity convention does not authenticate the speaker. It is inspectable ordinary knowledge, not a separate JavaScript identity cache.

First-person resolution must record its selected entity and carry the speaker relation as causal evidence. New assertions must inherit that evidence's [assumption](../wiki.html#definition-assumption) dependencies before execution. Rejection must retract unsupported speaker and dependent facts and invalidate dependent saved values. Independent explicit support survives. Replacing then rejecting a speaker must not silently restore an older selection. A missing speaker must prompt for a name rather than interpret `I` as a free logical variable.

[Session](../wiki.html#definition-session) [snapshots](../wiki.html#definition-snapshot) must preserve speaker facts and their evidence through the existing SOP knowledge and interpretation [snapshots](../wiki.html#definition-snapshot). Restoration must not replay conversational text. [Session](../wiki.html#definition-session) isolation and API history-prefix matching remain authoritative. An old unresolved introduction does not become knowledge merely because a new runtime can parse it.

### Reply usefully and retain diagnostics

SOP response [circuits](../wiki.html#definition-semantic-circuit) must render greetings, person descriptions and capability guidance. Supported capability claims must correspond to executable examples. Person descriptions must report stored facts without inventing a biography. Internal speaker relations must remain available for audit but be omitted from ordinary descriptions. Conversational replies may shorten explanation formatting while retaining the actual [assumption](../wiki.html#definition-assumption) IDs, categories, selected symbols and reasons. Answer-only mode retains full structured evidence.

An unrecognized request must remain an unresolved result with no fabricated semantic answer. Its normal explained reply must offer a concrete clarification or supported form. Actual classifier output belongs in `gap.tokens` and exported feedback. Separately recognized sentences may still execute. Operational errors, invalid semantic rules and budget exhaustion must retain transactional failure behavior.

The supported first-person forms, small-talk expressions and prefixes are defined by installed [circuits](../wiki.html#definition-semantic-circuit) and regression examples. General anaphora, unrestricted conversational English, live information, arbitrary prose generation and autonomous coding are outside this contract. The elementary [benchmark](../wiki.html#definition-benchmark) remains unchanged; conversation tests and numbered examples supply separate evidence.

### Interpret arithmetic requests and clarify numerical gaps

Conversation-mode arithmetic [circuits](../wiki.html#definition-semantic-circuit) must compose request prefixes, two numeric operands and an operator into the existing calculateNumber command. They must use the actual supplied operands and must not obtain answers from examples, help text or evaluation data. Number signs and symbolic operators may share adjacent text. Subtracting A from B must preserve the requested argument order as B minus A. Strict parsing retains its exact accepted forms.

SOP must supply lexical alternatives, edit bounds, categories and reasons. Generic matching may accept a unique nearest meaning within one edit, including transposition, for words of 3 to 32 letters. Numeric tokens and arbitrary entity names must not be altered by this arithmetic policy. Every accepted repair must be recorded before command execution and must retain the original and selected spelling. The whole calculation must match before a repair can lead to execution. Ambiguous nearest meanings must not be chosen silently. Existing rejection and saved-value invalidation contracts apply to lexical repairs.

An arithmetic expression must contain two numeric operands and one operation under these forms. Unsupported words, units, additional operators and trailing instructions must not be discarded to obtain a partial result. Such input remains unresolved. When numerical context is present, SOP clarification should identify the detected numbers and offer an arithmetic form. General capability and gap guidance must not repeatedly prescribe an unrelated domain example. This guidance is authored [circuit](../wiki.html#definition-semantic-circuit) text, not a learned selection mechanism.
