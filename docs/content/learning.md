# Learning and circuit packs

Use a circuit pack to add language constructions, semantic execution, response strategies, or explicit document knowledge. A coding agent can author the pack and submit acceptance examples. Installation validates syntax, references, circuit names, call inputs, and local dependency cycles before publishing competence.

## Learn a paraphrase

Create `training.json` with surface/canonical examples:

```json
[
  {"surface":"Able Alice.","canonical":"Alice can help Bob."},
  {"surface":"Able Carol.","canonical":"Carol can help Bob."}
]
```

```text
/session new training
/learn training.json
Able Dana.
Can Dana help Bob?
Does Dana help Bob?
```

The modal question returns Yes. The unqualified question remains Unknown. Induction preserves the qualifier, validates all supplied samples in memory, then publishes the pack. A failed validation or name collision rolls back registry and symbolic state. Named sessions preserve learned circuits across restarts. Temporary sessions require an explicit save.

## Author and install a pack

A pack root contains `circuits/` with named `.sop` files. Subdirectories define groups, and names are unique across the loaded library. A group ending in `.bootstrap` runs on installation and startup. `/load extensions/document-atlas` installs the repository's authored Atlas pack. `/save new-pack` exports current asserted knowledge as an installable bootstrap pack; it does not export learned grammar and refuses knowledge with active assumption dependencies. `/session save <name>` captures the complete session competence and knowledge instead.

Agents can call `POST /v1/sessions/{id}/packs` with SOP files and mandatory exact-result tests:

```json
{
  "files": [{
    "path": "agent/bootstrap/AgentFact.sop",
    "source": "@a makeConstant\n value \"delta\"\n@f makeUnaryAtom\n subject $a\n predicate \"reliable\"\n@w kbAssertFact\n atom $f\n@output result $w\n"
  }],
  "tests": [{"input":"Is Delta reliable?","expected":"Yes."}]
}
```

Paths are relative to the uploaded pack's `circuits/` directory. Absolute paths, traversal, duplicate circuit names, empty packs, and missing tests are rejected. The limit is 1,000 files and 128 acceptance tests within the API body limit. Tests run in a separate trial snapshot, so test assertions do not become session knowledge. Accepted installation and its bootstraps commit together as a new session revision. This endpoint executes supplied SOP; it does not launch an external coding agent or grant shell access.

## Authoring contract

Use ordinary SOP calls and typed values for competence. Keep domain vocabulary and linguistic decisions in circuits. Generic host operations belong in the runtime only when they express a reusable execution need. A reusable result may contain JSON-compatible scalars, lists, and objects. References resolve explicitly; source strings are never evaluated as JavaScript.

Circuits may recurse. Local wire cycles are invalid, and runtime recursion consumes the request budget. SOP syntax validity and passing acceptance examples do not prove a circuit's behavior on every input. Include rejection, ambiguity, and session-restart examples when the pack changes those boundaries.

## Improve a failed interpretation

Run `/example 15`, then try an unfamiliar construction in a named session. `/assumptions` shows the selected category, original word, resulting predicate and circuit. `/reject <id> <reason>` records the correction and removes dependent knowledge. `/feedback new-file.json` exports this evidence and unresolved inputs without overwriting an existing file.

A coding agent can turn the failing input and correction into a canonical training pair or a SOP interpretation circuit. Language policies belong in `circuits/english/interpretation/`, reusable slot and review policies in `interpretationSupport/`, and punctuation policies in `inputRepair/`. Installed strict parser competence takes precedence over fallback guesses. Include successful variations, incorrect alternatives, rejection and session restart in regression evidence. Pack acceptance tests remain strict; they do not pass merely because conversation mode guessed a plausible meaning. The exported report does not launch or train an agent by itself.
