# Text API

Applications can use the local runtime through text Chat Completions and Models endpoints. The request and response envelope follows the [OpenAI Chat Completions reference](https://developers.openai.com/api/reference/resources/chat) and the [Models reference](https://developers.openai.com/api/reference/resources/models/methods/list). Compatibility covers the documented subset, not every OpenAI endpoint or request option. Session references, reusable values, interpretation metadata, assumption correction and circuit installation are sdlm extensions.

## Start and connect

```sh
npm run server
```

The default address is `http://127.0.0.1:3000/v1`. Use model `sdlm`. Set `SD_LM_API_KEY` to require a bearer token. Binding a non-loopback address requires this token. The server is intended for one trusted workspace. Every holder of the token can access every session; there is no per-user authorization or tenant isolation.

```js
import OpenAI from 'openai';
const client = new OpenAI({
  baseURL: 'http://127.0.0.1:3000/v1',
  apiKey: process.env.SD_LM_API_KEY || 'local',
  maxRetries: 0
});
const answer = await client.chat.completions.create({
  model: 'sdlm',
  messages: [{ role: 'user', content: 'Alice is human.\nIs Alice human?' }]
});
console.log(answer.choices[0].message.content);
```

Without a session reference each request starts with fresh knowledge. Conversation mode splits newline input and sentence boundaries, tries supported interpretations, and commits usable results together. Unresolved language produces a partial result without undoing useful sentences. Operational failures still roll back the request. Set `interpretation: "strict"` to require exact parsing and rollback on unsupported input. The SDK needs a nonempty placeholder API key even when local authentication is disabled.

## Session references and history

Create the session explicitly, then send its ID with each new turn.

```sh
curl -s http://127.0.0.1:3000/v1/sessions -H 'Content-Type: application/json' -d '{"id":"demo"}'
curl -s http://127.0.0.1:3000/v1/chat/completions -H 'Content-Type: application/json' -d '{"model":"sdlm","session_id":"demo","messages":[{"role":"user","content":"Alice is human."}]}'
```

Use `session_id`, `metadata.session_id`, `X-SDLM-Session-Id`, or `session: {id, revision}`. Conflicting IDs are rejected. A supplied revision must equal the current committed revision; a stale revision returns 409 before executing new input. This allows a client to protect a retry against double execution. Requests without a revision append a new turn and are not idempotent.

A session pointer can also occupy the first history message. It is an extension that the server consumes before language parsing:

```json
{
  "model": "sdlm",
  "messages": [
    {"role":"system","content":[{"type":"sdlm_session","id":"demo"}]},
    {"role":"user","content":"Is Alice human?"}
  ]
}
```

Send either one new user message or the unchanged full conversation followed by new messages. The server compares a hash of the prefix, ignores the already committed messages, and executes only the suffix. It also accepts the retained history returned by the session endpoint. A mismatch returns 409, and assistant messages never assert knowledge. The server restores the SOP snapshot; it does not replay historical language commands. Snapshot loading still builds runtime indexes and recomputes rule closure.

Each named completion contains `sdlm.session_id`, `sdlm.revision`, `sdlm.ignored_messages`, `sdlm.executed_inputs`, `sdlm.history_messages`, and `sdlm.variables`. Response headers also include `X-SDLM-Session-Id` and `X-SDLM-Session-Revision`. These fields describe the revision committed before the response. Stateless completions have no durable variables. Successful pack, learning, run and retraction responses also expose the committed ID and revision under `sdlm`.

## Reuse values in new tasks

A turn stores `turn_N` as SOP constructors with `results` and `text`. Each result contains the original processed input, parsed command, structured answer, and rendered text. Conversation results also expose assumptions, selected candidates, token rewrite chains, reconstructed proofs, proof dependencies, conditional premises and unresolved gaps. Introductions and personal references use the same [conversational circuits](conversation.html) as the CLI. The current speaker persists in named sessions; an unresolved earlier introduction must be submitted again. Assumption rejection invalidates dependent saved values and further values made through explicit references. Their contents remain inspectable but reference lookup fails. Names are session-local. Up to 200 named values are retained; an expired or unknown path is an error.

```json
{
  "model": "sdlm",
  "session_id": "demo",
  "bindings": {"person":"turn_1.results.0.command.payload.args.0.value"},
  "messages": [{"role":"user","content":"Is {{person|capitalize}} human?"}]
}
```

For a first turn `Alice is human.`, the binding resolves to `alice`. The explicit `|capitalize` filter restores the initial capital required by entity patterns. Text bindings accept scalars and perform explicit substitution without evaluating code. Use the run endpoint to pass complete structured values into circuits:

```sh
curl -s http://127.0.0.1:3000/v1/sessions/demo/run -H 'Content-Type: application/json' -d '{"circuit":"RenderEnglish","inputs":{"answer":{"$ref":"turn_2.results.0.answer"}},"save_as":"rendered"}'
```

## Routes

| Route | Result |
| --- | --- |
| `GET /health` | Process availability and model name |
| `GET /v1/models` and `GET /v1/models/sdlm` | Model envelope |
| `POST /v1/chat/completions` | Text completion or SSE chunks |
| `GET /v1/capabilities` | Examples and compatibility boundary |
| `POST /v1/sessions` | Create an isolated session; optional `id` |
| `GET /v1/sessions` | List session records |
| `GET /v1/sessions/{id}` | Revision, retained conversation, audit and history digest |
| `GET /v1/sessions/{id}/values` | Saved values and invalidated value names |
| `GET /v1/sessions/{id}/assumptions` | Decisions, assertion supports, rejected interpretations and gaps |
| `POST /v1/sessions/{id}/reject` | Reject an assumption by `id` with optional `reason`, retract dependencies and invalidate results |
| `POST /v1/sessions/{id}/run` | Run a circuit with `inputs` and optional `save_as` |
| `POST /v1/sessions/{id}/packs` | Install SOP sources after acceptance tests |
| `POST /v1/sessions/{id}/learn` | Induce circuits from `examples` pairs |
| `POST /v1/sessions/{id}/forget` | Retract the assertion given in `text` |

## Supported protocol and limits

Messages contain string `content` with roles `user`, `assistant`, `system`, or `developer`. System and developer text uses the same supported language and response-style instruction circuits as user input. It is not general instruction understanding. The last message must be user. The session pointer above is the only supported content-array extension. At most 4,096 history messages and 1 MiB of JSON are accepted; at most 128 new nonempty lines and 128 conversation sentences execute per request.

The supported parameters are `model`, `messages`, `stream`, `stream_options.include_usage`, deterministic `temperature: 0`, `top_p: 1`, `n: 1`, `interpretation: "assist" | "strict"`, `verbosity: "answer" | "explain"`, and the session extensions described here. Unsupported parameters return 400. There are no tools, function calling, images, audio, embeddings, Responses API, or stochastic sampling. Usage counts come from the SOP tokenizer and do not equal OpenAI token counts.

SSE emits `chat.completion.chunk` objects, a stop chunk, optional usage, and `[DONE]`. Computation and durable publication finish before chunks are delivered. This is buffered streaming, not incremental inference. Session metadata appears on chunks. Clients must handle errors before opening the stream.

Errors use the `error` envelope. Malformed requests return 400, invalid authentication 401, missing sessions 404, duplicate names or history/revision conflicts 409, oversized bodies 413, unsupported language in strict mode 422, and exhausted execution or request capacity 429. Storage failures return 500. The server admits at most 16 pending requests by default. Cooperative VM limits do not preempt a blocking backend call. Use process isolation and external storage quotas for deployments accepting hostile workloads.

## Interpretation metadata

Every completion, including a stateless one, contains `sdlm.interpretation`, `sdlm.results` and `sdlm.assumptions`. Each assumption has an ID, input, category, original symbol, selected value, reason and circuit. These records describe decisions made before execution. `context_assumptions` in a result names session contributors whose individual role in an aggregate has not been established. `provenance_complete: false` marks an incomplete reconstructed proof.

Use `GET /v1/sessions/{id}/assumptions` to inspect durable evidence. `POST /v1/sessions/{id}/reject` accepts `{"id":"a2","reason":"These are different people"}` and returns retracted assertions, invalidated value names and the new session revision. [Assumptions and correction](assumptions.html) documents the complete contract and limitations.

## Response detail

Set `verbosity: "answer"` for answer-only visible text or `verbosity: "explain"` to include explanations and assumptions. Supported input such as `Answer only.` or `Show assumptions.` invokes the same SOP policy. The preference persists in named sessions and is exposed as `sdlm.preferences.response_style`. Requests using strict interpretation reject an explicit verbosity parameter. See [Response style](response-style.html) for precedence and complete examples.

Compact replies retain full typed results, `answer_text`, `explanation`, assumptions and proof metadata. They reduce visible prose, not the audit payload. Fresh sessions include the [elementary base knowledge](foundation.html); restored sessions retain their authoritative snapshots.

## Naming

The model ID and metadata key are `sdlm`; pointer types use `sdlm_session`, headers use `X-SDLM-Session-*`, and environment variables use `SD_LM_`. Integrations must use these documented identifiers. Historical prototype identifiers have no compatibility alias.
