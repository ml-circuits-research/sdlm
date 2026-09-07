# Sessions and reusable state

A session is a named independent knowledge state and circuit library. The CLI and API can share a session directory. Saving a session records asserted facts, rules, learned circuits, installed extensions, reusable values, assumptions, rejection feedback and response preferences as SOP Lang. The JSON record holds the conversation, revision pointer, and execution audit.

## Durable publication

A request takes the session lock, restores its committed revision, runs the requested work, and writes a new revision directory. Only after the entire SOP pack exists does the store atomically replace `session.json`. An error before pointer replacement leaves the old revision authoritative. Runtime mutations also have an in-memory transaction boundary. No request shares mutable runtime state with another session.

The store keeps the current and previous revision and prunes older revisions after publication. This is atomic replacement on a local filesystem, not a database transaction across machines and not a guarantee of power-loss durability through fsync. Use a local filesystem with reliable rename and lock semantics. Back up the complete session directory. No network-filesystem lock guarantee is claimed.

```text
sessions/demo/
  session.json
  revision-<uuid>/circuits/
    session/snapshot/SessionSnapshot.sop
    session/values/SessionValues.sop
    session/interpretation/SessionInterpretation.sop
    session/settings/SessionSettings.sop
    ...installed and induced circuits...
```

SOP restoration rebuilds runtime indexes and derived facts. It never reparses past conversation text. Retraction survives restart even when a document bootstrap originally introduced the fact. Session initialization uses the current base library, so changing base circuits can change behavior; snapshots are not self-contained archives of the runtime version.

## Continuation and isolation

Session names contain 1 to 64 ASCII letters, digits, underscores, or hyphens. Creation refuses an existing name. `/session save <new name>` forks current competence and knowledge; the new conversation starts empty. `/session use <name>` resumes. Separate sessions do not see one another's assertions, values, or learned circuits. They share the immutable base library and configured runtime implementation.

The conversation record retains the last 200 messages for inspection. A rolling hash and count validate a longer full prefix without storing the entire text. The API accepts up to 4,096 messages per request; clients with longer transcripts should send a single new user message and the session ID. This avoids re-execution, but hashing a retransmitted history still costs time proportional to that history.

## Value references

`turn_N` stores structured chat results. `/run` saves `last_task`; API circuit calls can select a `save_as` name. `$ref` traverses existing own properties by dot-separated names and numeric array indices. No JavaScript expressions or prototype traversal run. Names contain a leading letter followed by letters, digits or underscores, up to 64 characters. Rebinding replaces a named value; at most 200 names remain, in insertion order. Large value trees can exhaust snapshot execution budgets.

## Concurrency and recovery

Each in-process store serializes mutations. A filesystem lease coordinates separate processes using the same session. A stale lease can be recovered after 60 seconds; live writers refresh it. Read-only inspection sees a committed pointer. Execution limits are cooperative, so a backend call blocking the event loop can delay the lease heartbeat. This local store is suitable for bounded trusted work, not distributed scheduling.

There is no session deletion endpoint. Stop writers before moving or deleting session directories yourself. Temporary CLI sessions disappear on exit unless explicitly saved. For unrelated users use distinct stores and separate API processes until authenticated per-user ownership is implemented.

## Assumption continuity

`SessionInterpretation.sop` preserves the decisions actually used, support sets for assertions, rejected mappings, gaps and saved-value dependencies. Rejection removes only assertions without independent support and recomputes derived facts. Saved results depending on the rejected decision become invalid for `$ref` and text bindings. `/vars` still displays historical contents; `/assumptions` and the API values response identify invalidated names. Reference dependencies store assumption IDs, so they survive eviction of an earlier source value. Direct strict circuit calls expose low-level execution and do not provide conversational prose about assumptions.

The ledger retains at most 2,048 decisions, 100 unresolved inputs and 200 rejection notes. Feedback export is local inspection data for circuit authors. It does not trigger autonomous agent work.

## Defaults and presentation preferences

Fresh sessions bootstrap elementary knowledge and default to explained conversation responses. The selected response style is stored in `SessionSettings.sop`. A named CLI or API request saves a changed preference automatically. Another session keeps its own preference. A failed request restores settings along with knowledge and evidence.

Restoration treats the saved knowledge snapshot as authoritative. It preserves retractions and does not silently merge newly released base knowledge into old sessions. Older packs without settings use the default response style. A fresh session is the way to test the full installed elementary library. There is no general migration guarantee across incompatible base circuit versions.

## Interactive continuation and input recall

The CLI remembers its last selected durable session per storage directory and restores it on ordinary interactive startup. A first startup without saved sessions creates one automatically. `/session new [name]` and interactive `/reset` create independent durable sessions; `/session use <name>` restores an existing one. An explicit `--session` overrides the remembered selection. `--temporary` starts temporary work while leaving that selection intact.

CLI input recall lives in `cli-history.json` inside each session directory, with the last selected ID in the root `.cli-state.json`. It includes slash commands and failed attempts, is bounded to 1,000 entries and does not replay on startup. These files are separate from `session.json`, its rolling API history hash and the SOP semantic revision. Forked sessions start with fresh command history. The [CLI guide](cli.html) describes exclusions, legacy history recovery and concurrent terminals.

## Continue the speaker

Introductions store the current speaker as ordinary SOP knowledge with interpretation evidence. Personal references use that entity after restart. `/session new [name]` starts without a speaker; switching to an existing session restores its own selection. Earlier unresolved introductions remain gaps until submitted again. See [Everyday conversation](conversation.html) for supported forms and correction.
