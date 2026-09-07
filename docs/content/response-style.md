# Response style

Choose whether conversation replies show only the answer or also show the assumptions and explanations used to obtain it. This preference changes visible text. Structured answers, actual decisions, proof support and correction remain available in both modes.

## Switch in the CLI

```text
/verbosity
/verbosity answer
Socrate is a human. All humans die. Is Scorate going to die?
/assumptions
/verbosity explain
Is Scorate going to die?
```

`/verbosity` displays the selected preference. In `answer` mode the first question displays only `Yes.`. In `explain` mode the answer includes the name correction, temporal projection and support. `/assumptions` always inspects the ledger; `/reject <id>` still corrects a hidden assumption. `/example 20` executes this workflow, including a session restart.

The default is `explain`. The setting belongs to the selected session. Named sessions save it automatically; `/session save <name>` preserves it with temporary work. Switching to a fresh session starts with its own default. `/mode strict` selects exact low-level language execution and bypasses conversation presentation; use `/mode assist` to apply the preference again.

## Give an instruction in the input

These complete sentences are recognized by SOP circuits:

| Select only the answer | Restore explanation and assumptions |
| --- | --- |
| `Answer only.` | `Show assumptions.` |
| `Keep answers short.` | `Explain your answers.` |
| `Just the answer.` | `Arată presupunerile.` |
| `Doar răspunsul.` | `Arata presupunerile.` |
| `Doar raspunsul.` | |

```text
Answer only. Socrate is a human. All humans die. Is Scorate going to die?
```

This returns `Yes.`. The instruction is a preference command, not an asserted fact. If a request contains a question, compact presentation suppresses fact acknowledgements and preference acknowledgements. Multiple questions keep their respective answers. A request containing only an assertion still returns `Learned.`; a preference-only request confirms its setting. Uninterpreted text returns `I don't know.` in compact mode while the gap and recognized categories remain inspectable.

Instructions persist for subsequent turns. Within one request, the final selected preference formats all its results. Use separate turns when you want one answer explained and the next shortened. These are supported instruction forms, not general instruction understanding. The Romanian controls do not imply Romanian reasoning coverage.

## Use the API or library

```json
{
  "model": "sdlm",
  "verbosity": "answer",
  "messages": [
    {"role": "user", "content": "Socrate is a human. All humans die. Is Scorate going to die?"}
  ]
}
```

The visible answer is `choices[0].message.content`. `sdlm.preferences.response_style` gives the selected preference. Each item in `sdlm.results` retains `answer_text`, `explanation`, `assumptions`, `proof` where available, and the selected `text`. Top-level `sdlm.assumptions` also remains available. Compact mode reduces displayed prose; it does not reduce the audit payload or the computation needed to produce it. SSE uses the same final text and metadata.

Supported system, developer or user text can contain the instruction sentences above. The optional `verbosity` parameter is applied before the new input; an explicit later input instruction can change it. Named requests save the setting in that session; stateless requests start independently. `interpretation: "strict"` with an explicit `verbosity` parameter is rejected, since strict execution bypasses conversation formatting.

```js
import { createSDLM } from './src/sd_lm.mjs';

const model = await createSDLM();
await model.setResponseStyle('answer');
console.log(await model.respond('What is 6 times 7?'));
const results = await model.respondDetailed(['Is Nobody a cat?'], { verbosity: 'explain' });
console.log(results[0].text);
```

## Circuit ownership

`SetResponseStyle`, `PresentConversation` and circuits under `circuits/conversation/` validate choices, select text and assemble explanatory sections. Input forms live under `circuits/english/interpretation/`. `SessionSettings.sop` stores the preference with ordinary SOP constructors. JavaScript supplies generic session storage, collection operations and read-only circuit mapping. The mapping checks the target's effects before executing it and shares the request budget. A failed request rolls back preference changes with other symbolic state.
