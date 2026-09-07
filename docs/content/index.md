# sdlm

sdlm is a local symbolic language runtime for asserting knowledge, applying explicit rules, asking questions, and adding competence through executable SOP Lang circuits. Conversation mode tries bounded interpretations and lets users correct explicit assumptions. Its CLI makes the supported language testable. Its text Chat Completions API lets applications use the same engine with isolated, durable sessions.

The technical name is `sd_lm`; documentation and interfaces use **sdlm**. The first letter means Symbolic, Small or Specific, `d` means Datalog, and `lm` means Language Model.

Start with the CLI, say `Hello` and run example 21 for a conversation. Read [Everyday conversation](conversation.html) for introductions and personal references. Run example 5 to inspect the document knowledge pack. Run example 14 for the Socrate question and explicit assumptions. Read Capabilities and Assumptions before choosing tasks, then Architecture and the Book for the execution model. Developers can install circuits, verify them against acceptance examples, and inspect the normative Specifications. The Wiki explains project terms.

## Start locally

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
/status
/quit
```

Interactive `npm start` resumes the last selected session automatically, including command recall with Up/Down. Use `/session new [name]` for separate work or `npm start -- --session demo` to select a specific session. Start HTTP with `npm run server`. Start this documentation with `npm run docs:serve` and open `http://127.0.0.1:8080`. If the port is occupied, use `SD_LM_DOCS_PORT=8088 npm run docs:serve`.

## Documentation Map

{{DOC_MAP}}

## Product boundary

The installed circuits recognize controlled English and supported domain constructions. Circuit authors can add new parsers, semantic commands, domain knowledge, and response strategies. General English understanding, autonomous research, and neural text generation are outside the demonstrated contract. Repository-local agent instructions are development tooling; the product distributes SOP circuits and a JavaScript runtime, not a product skill catalog.

{{INVENTORY}}
