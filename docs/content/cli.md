# CLI

Use the CLI to test sentences, inspect their meaning, compare expected and actual results, and continue saved sessions. It needs Node.js 22 or newer and installed dependencies. No cloud account is required.

Say `Hello`, introduce yourself with `My name is Jhon.`, or ask `What can you do?`. Read [Everyday conversation](conversation.html) for personal references and useful requests. `/example 21` runs a complete conversation; `/example 22` tries polite requests and clarification. `/example 23` tests arithmetic wording and spelling repair, including `hwo much is 3 plus 5?`.

## Interactive use

```sh
npm start
```

Interactive startup automatically resumes the last session selected in this session store. If no selection has been recorded, it resumes the most recently updated saved session or creates a durable session when none exists. The startup banner shows the selected ID. Knowledge, learned circuits, saved values and response preferences continue from its SOP snapshot.

Use Up/Down to recall submitted input across restarts, including slash commands and failed attempts. Recall only fills the editor; it does not execute old input. Switching sessions loads that session's own command history. `/history commands` displays submitted CLI input, while `/history` displays the retained conversation.

```text
/session new work
/verbosity answer
Alice is human.
Is Alice human?
/quit
```

Start `npm start` again and press Up. The question is recalled from `work`; press Enter to run it. `/quit` is omitted from recall so the first Up does not immediately offer another exit.

| Command or startup option | Behavior |
| --- | --- |
| `/session new [name]` | Create and select an independent durable session; omitted names get an ID automatically |
| `/session list` | List saved sessions |
| `/session use <name>` | Resume a chosen session and its input history |
| `/session save <name>` | Fork current state into a new durable session |
| `/reset` | Start a new durable session in interactive use |
| `npm start -- --session <name>` | Override automatic selection |
| `npm start -- --temporary` | Start temporary work without changing the remembered selection |

Temporary work becomes durable if you use `/session save <name>` or select a named session. Each `--sessions <directory>` has an independent remembered selection. The last explicit interactive selection wins when several terminals share a store. File and pipe input start with temporary state unless `--session` is supplied; they do not update the remembered interactive selection.

Conversation mode accepts several sentences on one line and attempts interpretations with explicit assumptions. `/mode strict` selects exact controlled-English parsing. `/help` lists every command. `/examples` lists the catalog; `/examples 14` displays the scenario, its inputs and expected results without executing it. `/example 14` executes it immediately. `/example all` runs the entire catalog. Each run uses separate temporary state and reports PASS or FAIL per step.

Examples 1 through 13 exercise strict core behavior; 14 through 16 exercise assumptions, correction and partial understanding. These original scenarios disable elementary base knowledge for isolation. Examples 17 through 20 enable it and cover elementary reasoning, quantities and movement, conditional defaults and response style. Use `/benchmark eval` for the separate 44-case evaluation split or `/benchmark all` for all 88 questions. Read [Elementary evaluation](benchmark.html) for scoring and limits.

Use `/verbosity answer` to show only answers and `/verbosity explain` to restore explanations and assumptions. You can also enter `Answer only.` or `Show assumptions.` in the conversation. `/verbosity` shows the preference; `/assumptions` always exposes the evidence. The [response style guide](response-style.html) explains persistence, API controls and supported input instructions.

Typing and pasted text appear at the prompt before execution. Use Backspace to edit and the Up/Down arrows to recall commands. Paste through your terminal's normal shortcut, usually Ctrl+Shift+V on Linux. Complete pasted lines execute in order; a final line without a newline stays visible for editing until you press Enter. `/quit` or Ctrl+C exits and restores the terminal's normal input mode.

Read [Assumptions and correction](assumptions.html) for `/assumptions`, `/reject` and `/feedback`. Rejected decisions can retract dependent knowledge and invalidate saved references. The mode is a CLI setting; session state preserves decisions and corrections.

{{COMMANDS}}

## A session you can continue

```text
/session new demo
Alice is human.
Every human is mortal.
Is Alice mortal?
Why is Alice mortal?
/kb
/session list
/quit
```

```sh
npm start -- --session demo
```

```text
Is Alice mortal?
/forget Alice is human.
Is Alice mortal?
/history
```

The first question returns `Yes.`. After retraction the question returns `Unknown` with the missing support. `/session save copy` forks the current knowledge and competence into a new session. `/reset` selects a new durable session interactively and a clean temporary runtime in batch use. Ordinary temporary work needs `/session save <name>` for persistence. A new name must not already exist.

## Inspect structured execution

```text
/parse Alice is human.
/run ProcessTextResult {"text":"Is Alice human?"}
/vars
/run RenderEnglish {"answer":{"$ref":"last_task.answer"}}
/trace last
/status
```

`/run` executes an installed circuit and stores its result as `last_task`. A `$ref` input reads a saved value by its dot-separated path. `/parse` returns the semantic command without asserting the fact. `/trace off` disables terminal trace output; bounded trace retention remains available for inspection.

## Automation and exit codes

```sh
node src/cli.mjs --run 5 --json
node src/cli.mjs --run all --backend bundled --json
node src/cli.mjs --backend external examples/demo.sopnl
node src/cli.mjs --extension extensions/research-pack examples/research-pack.sopnl
printf '/help\n/example 5\n/quit\n' | node src/cli.mjs
```

A failed command, strict-mode unsupported sentence, execution failure or failed expected result gives exit code 1 in batch use. In conversation mode an unresolved sentence is a successful partial response and is saved as a gap for inspection. The interactive prompt continues after an error. `--sessions <directory>` selects the session store; use the same directory in the API for shared local sessions. `--trace` prints execution events. `--help`, `--examples`, `--run`, `--json`, `--backend`, `--extension`, `--session`, and `--temporary` are the supported startup switches.

## Example catalog

{{EXAMPLES}}

## Stored terminal history

The store keeps the selected ID in `.cli-state.json` and up to 1,000 submitted entries per session in `<session>/cli-history.json`. Blank lines, comments, `/quit` and entries longer than 8,192 characters are omitted. Consecutive duplicate entries collapse. Writes are atomic and locked so concurrent terminals do not overwrite each other's appended history. Saving recall does not publish a new semantic revision.

If a saved session has no CLI history file, its retained user messages seed recall. Old slash commands that were never recorded cannot be recovered. A missing remembered session falls back to another saved session or a new one, with a notice. Corrupt existing session state fails restoration rather than silently switching to unrelated knowledge. These JSON files are terminal bookkeeping; semantic state remains SOP and API history matching remains separate.

## Try a quantity story

Run `/examples 24` to inspect the quantity-context scenario, or `/example 24` to execute it in isolation. In your own session, enter `Jgon has 3 eggs. He received 4. How many eggs he has now?`. `/verbosity answer` shows only `7.` for this problem; `/verbosity explain` shows the pronoun, omitted-item and question-normalization assumptions. `/assumptions` and `/reject <id>` remain available in either style. Read [Quantity problems](conversation.html#solve-a-quantity-problem-across-sentences) for continuation and ambiguous-context examples.
