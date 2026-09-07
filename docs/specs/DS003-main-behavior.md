---
title: DS003-main-behavior
summary: Defines the principal user outcomes, continuity and execution guarantees.
---

## Introduction

This specification defines the principal user outcomes, continuity and execution guarantees for [sdlm](../wiki.html#definition-sdlm).

## Core Content

### Main Behavior Components

| Name | Explanation |
| --- | --- |
| Interpret language over explicit and assumed knowledge | CLI and chat callers use elementary [base knowledge](../wiki.html#definition-base-knowledge) and receive executable meanings, declared [assumptions](../wiki.html#definition-assumption), partial results and rule-supported answers. |
| Reject [assumptions](../wiki.html#definition-assumption) and recompute dependent knowledge | Users correct decisions, remove unsupported assertions and invalidate dependent saved results. |
| Preserve state across failed and speculative execution | [Transactions](../wiki.html#definition-transaction) and [effect](../wiki.html#definition-effect-analysis) checks protect committed work during search and failure. |
| Add validated competence as [SOP circuits](../wiki.html#definition-semantic-circuit) | Authors extend behavior through tested [induction](../wiki.html#definition-induction) and [circuit packs](../wiki.html#definition-circuit-pack). |
| Continue isolated [sessions](../wiki.html#definition-session) and reuse saved values | Clients resume SOP state and consume prior results without replaying history. |
| Inspect and integrate demonstrated capabilities | The CLI and text API make capabilities executable and inspectable. |

### Interpret language over explicit and assumed knowledge

CLI users and HTTP clients submit statements and questions. Conversational [circuits](../wiki.html#definition-semantic-circuit) recognize greetings, introductions and capability questions before general parsing. They resolve supported personal references through the [current speaker](../wiki.html#definition-current-speaker), use bounded [quantity focus](../wiki.html#definition-quantity-focus) to fill inventory owners and items, and return useful clarification for language gaps. [DS017](../specsLoader.html?spec=DS017-conversational-interaction.md) owns this interaction contract. Conversation mode must try installed parsing and bounded SOP interpretations, record [assumptions](../wiki.html#definition-assumption) before executing [semantic commands](../wiki.html#definition-semantic-command), and expose usable partial results for unresolved input. Facts, safe rules, [four-state](../wiki.html#definition-four-valued-status) queries and reconstructed explanations define the reasoning outcome. Fresh [sessions](../wiki.html#definition-session) include [elementary knowledge](../wiki.html#definition-base-knowledge); quantity and movement statements update current symbolic values. Response-style [SOP circuits](../wiki.html#definition-semantic-circuit) select answer-only or explained text while preserving full evidence. Strict mode retains exact parsing. [SOP circuits](../wiki.html#definition-semantic-circuit) own competence; heuristics do not establish general language understanding or calibrated accuracy. [DS005](../specsLoader.html?spec=DS005-knowledge-reasoning.md), [DS006](../specsLoader.html?spec=DS006-parsing-generation.md) and [DS013](../specsLoader.html?spec=DS013-assumption-guided-interpretation.md) define the boundaries.

### Reject assumptions and recompute dependent knowledge

Users inspect decisions through `/assumptions` or the [session](../wiki.html#definition-session) API and reject an ID with an optional correction note. The runtime must remove facts and rules without independent support, recompute closure and invalidate saved results carrying the rejected [assumption](../wiki.html#definition-assumption). Explicit independent support must survive. [Sessions](../wiki.html#definition-session) must preserve correction evidence without replaying text. Feedback export provides actual inputs and decisions for external [circuit](../wiki.html#definition-semantic-circuit) authors; it does not synthesize corrective [circuits](../wiki.html#definition-semantic-circuit) automatically. [DS013](../specsLoader.html?spec=DS013-assumption-guided-interpretation.md) owns this correction contract.

### Preserve state across failed and speculative execution

Every user operation must preserve earlier committed work when a [candidate](../wiki.html#definition-candidate), request or budget fails. Serialized mutations, nested [transaction](../wiki.html#definition-transaction) scopes and conservative [effect analysis](../wiki.html#definition-effect-analysis) determine whether speculative execution is safe. The observable result is either a committed operation or unchanged prior symbolic state. Recursive [circuits](../wiki.html#definition-semantic-circuit) consume execution budgets. [DS004](../specsLoader.html?spec=DS004-execution-safety.md) owns the detailed safety limits.

### Add validated competence as SOP circuits

[Circuit](../wiki.html#definition-semantic-circuit) authors and external coding agents use `/learn`, `/load`, or the [session](../wiki.html#definition-session) pack API to introduce language and domain behavior. Validation must precede durable publication, and HTTP acceptance tests must use separate trial state. Successful competence must remain executable SOP and survive a saved [session](../wiki.html#definition-session) restart. Installation does not run an autonomous coding agent or prove behavior beyond its tests. [DS007](../specsLoader.html?spec=DS007-circuit-learning-packs.md) owns this contract.

### Continue isolated sessions and reuse saved values

Interactive CLI startup automatically resumes its last selected [session](../wiki.html#definition-session), creating a durable [session](../wiki.html#definition-session) when the store is empty. Users may create independent work with `/session new [name]`, select another with `/session use <name>`, or choose `--temporary`. Input recall follows the selected [session](../wiki.html#definition-session) without replaying commands. API clients select a named [session](../wiki.html#definition-session) explicitly and continue its knowledge, learned competence, response preference and [quantity focus](../wiki.html#definition-quantity-focus). Contextual quantity updates must retain causal [assumptions](../wiki.html#definition-assumption), and restored focus must be checked against live quantities before reuse. The store must restore committed SOP state, ignore a matching historical prefix, execute only new input, and publish a complete new revision. Clients may pass references to saved structured outputs into later [circuits](../wiki.html#definition-semantic-circuit). [Session](../wiki.html#definition-session) metadata must name the committed revision. Other [sessions](../wiki.html#definition-session) must not see those values or mutations. [DS008](../specsLoader.html?spec=DS008-sessions.md) owns continuity and isolation.

### Inspect and integrate demonstrated capabilities

Users run `/help` and `/examples N` to inspect commands and scenarios, then `/example N` to execute an isolated example with expected and actual results. `/benchmark` measures elementary coverage using fresh cases from the fixed corpus. Application clients use Models and text Chat Completions, including buffered SSE. Inspection commands expose knowledge, values and bounded execution evidence. The interfaces must reject unsupported protocol features and keep the example run separate from user state. [DS009](../specsLoader.html?spec=DS009-cli.md) and [DS010](../specsLoader.html?spec=DS010-api.md) own the interface details.
