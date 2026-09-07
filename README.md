# sdlm

[sdlm](docs/wiki.html#definition-sdlm) is a local [symbolic language runtime](docs/wiki.html#definition-sdlm). It interprets [controlled English](docs/wiki.html#definition-cnl), attempts incomplete language with inspectable [assumptions](docs/wiki.html#definition-assumption), stores facts and rules, explains conclusions, and learns new expressions as [SOP circuits](docs/wiki.html#definition-semantic-circuit). The CLI exposes runnable examples and inspection commands. A text Chat Completions API gives applications isolated, continuing [sessions](docs/wiki.html#definition-session) and reusable structured results.

The technical name is `sd_lm`; documentation and interfaces use **[sdlm](docs/wiki.html#definition-sdlm)**. The first letter means Symbolic, Small or Specific, `d` means [Datalog](docs/wiki.html#definition-datalog), and `lm` means Language Model.

The installed model is bounded. It supports the constructions demonstrated in the examples and installed packs. Broad English comprehension, automatic document extraction, and unrestricted neural text generation remain outside its contract. The [capability guide](docs/capabilities.html) describes what is usable and what still needs engineering or research.

Say `Hello`, introduce yourself with `My name is Jhon.`, and ask `What can you do?`. The [conversation guide](docs/conversation.html) explains remembered names, first-person questions and clarification. Run `/example 21` for a complete conversation, `/example 22` for polite requests or `/example 23` for arithmetic wording and spelling repair.

## Install and try

Use Node.js 22 or newer and npm. Dependencies are pinned in the lockfile. No cloud credentials are needed for local use.

```sh
npm ci
npm start
```

```text
/help
/examples
/examples 14
/example 14
/example 17
/example all
/session new demo
/verbosity answer
Alice is human.
Every human is mortal.
Is Alice mortal?
Why is Alice mortal?
/status
/quit
```

Example 5 runs the Atlas document knowledge pack locally and compares expected with actual answers. Example 13 demonstrates saving and reusing structured results after a restart. Examples 14–16 demonstrate [assumptions](docs/wiki.html#definition-assumption), correction and partial understanding. Every numbered example uses an isolated temporary runtime. Resume the named [session](docs/wiki.html#definition-session) with `npm start -- --session demo`; its facts and learned [circuits](docs/wiki.html#definition-semantic-circuit) persist automatically. Interactive `npm start` automatically resumes the last selected [session](docs/wiki.html#definition-session), or creates a durable [session](docs/wiki.html#definition-session) on first use. Up/Down recalls that [session](docs/wiki.html#definition-session)'s submitted input across restarts. Use `/session new [name]` for independent work and `/session list` to inspect saved [sessions](docs/wiki.html#definition-session). `npm start -- --temporary` opts into temporary work, which needs `/session save <new name>` before exit.

## Understand and correct an interpretation

Conversation mode is the default in the CLI and chat API. Try the following in a fresh [session](docs/wiki.html#definition-session):

```text
Socrate is a human. All humans die. Is Scorate going to die?
/assumptions
/reject a2 These are different people
Does Scorate die?
/feedback reasoning-feedback.json
```

The initial answer is Yes under two declared [assumptions](docs/wiki.html#definition-assumption): a temporal projection and a name association. Rejecting the name association makes the Scorate query Unknown. IDs depend on earlier [session](docs/wiki.html#definition-session) decisions. [Assumptions and correction](docs/assumptions.html) explains evidence, dependent knowledge, invalidated values and feedback for [circuit](docs/wiki.html#definition-semantic-circuit) authors. `/mode strict` retains exact parser behavior.

## Inspect and extend

```text
/kb
/parse Alice is human.
/run ProcessTextResult {"text":"Is Alice human?"}
/vars
/run RenderEnglish {"answer":{"$ref":"last_task.answer"}}
/trace last
/load extensions/document-atlas
/forget Alice is human.
```

Use `/learn examples.json` for surface/canonical training pairs and `/save <new directory>` for a knowledge-only SOP pack with no active [assumption](docs/wiki.html#definition-assumption) dependencies. Save a full [session](docs/wiki.html#definition-session) to preserve those dependencies. The [CLI guide](docs/cli.html) lists every command. The [learning guide](docs/learning.html) documents pack structure and the coding-agent upload contract.

## Start the API

```sh
npm run server
```

Connect a text Chat Completions client to `http://127.0.0.1:3000/v1` with model `sdlm`. The [API guide](docs/api.html) includes curl and OpenAI SDK examples. Streaming delivers completed symbolic results as SSE. Unsupported protocol options are rejected.

Create a [session](docs/wiki.html#definition-session) with `POST /v1/sessions` and pass `session_id` on chat requests, or put an `sdlm_session` pointer in the first history message. A matching historical prefix is ignored; only new input executes against restored SOP state. Responses expose the committed revision and saved values under `sdlm`. Later tasks can use explicit `$ref` inputs. A supplied revision rejects stale requests before execution.

The server defaults to loopback port 3000. `--host`, `--port`, `--sessions`, and `--backend` configure startup. `SD_LM_API_KEY` enables bearer authentication and is required on non-loopback addresses. The token grants access to the whole local store; there is no multiuser ownership model. CLI and API can share the same `--sessions` directory.

## Configure and verify

`--backend bundled|external|auto` or `SD_LM_DATALOG_BACKEND` selects the reasoning engine. Explicit `external` must load the installed `@suss/datalog` package. `--extension <directory>` adds a pack at CLI startup. The JavaScript factory accepts `limits`, `maxTraceEvents`, [circuit](docs/wiki.html#definition-semantic-circuit) roots and learning roots; see [execution safety](docs/specsLoader.html?spec=DS004-execution-safety.md).

```sh
npm run test:backends
node src/cli.mjs --run all --json
npm run docs:build
npm run check
npm run docs:serve
```

Read the [HTML documentation](docs/index.html) at `http://127.0.0.1:8080` after starting the documentation server. If port 8080 is occupied, use `SD_LM_DOCS_PORT=8088 npm run docs:serve`. The [HTML book](docs/book.html) contains the research monograph and current operating guides. [Specifications](docs/specsLoader.html?spec=matrix.md) define the contract. [Validation](docs/validation.html) explains test evidence, fixed audit findings, and its limits. Generated documentation must be rebuilt when source changes; `docs:check` rejects stale files and broken links. The original DOCX and version 0.6 logs are archival.

## Evaluate elementary reasoning

```text
/benchmarks
/benchmark eval
/example 20
/verbosity answer
What is 6 times 7?
/verbosity explain
```

Fresh [sessions](docs/wiki.html#definition-session) include elementary SOP knowledge. The [foundation guide](docs/foundation.html) describes its domains and exceptions. The [benchmark guide](docs/benchmark.html) reports the fixed 88-case corpus, baseline and backend measurements. The [response style guide](docs/response-style.html) explains input instructions, API controls and retained audit evidence. The technical factory is `createSDLM` in `src/sd_lm.mjs`; environment variables use `SD_LM_`.
