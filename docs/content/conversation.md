# Everyday conversation

Start with `Hello`, `My name is Jhon.`, or `What can you do for me?`. sdlm can greet you, remember the current speaker, answer questions about known people, and use supported first-person statements in later reasoning. The same circuits serve the CLI, conversation API and library `respond` methods.

## Try the reported conversation

```text
/session new conversation
hello , I am Jhon
I am jhon
Hello
who is Jhon?
What you can do for me?
```

The introduction returns `Nice to meet you, Jhon. I'll use that name in this session.` A later greeting addresses Jhon, and the person question recognizes the introduction. The capability question lists supported tasks and runnable examples. `I am Jhon` records a name-classification assumption because an unfamiliar word after `I am` could also be an attribute. `My name is Jhon.` supplies the name explicitly.

Use `/examples 21` to inspect this scenario or `/example 21` to execute it in isolation. `/example 22` demonstrates polite requests and useful clarification. In your own session, `/verbosity answer` hides explanations and `/verbosity explain` restores them. The full assumptions remain available through `/assumptions` and API metadata.

## Use what you have told it

```text
My name is Jhon.
Every human is mortal.
I am human.
Am I mortal?
Who is Jhon?
Tell me about me.
```

The answer to the mortality question is `Yes.` The rule comes from the explicit sentence in this example. `Who is human?` still asks for members of a category; `Who is Jhon?` describes the person. An unknown person receives a request for information rather than a claim that nobody matches an unfamiliar predicate.

```text
I have 5 apples.
I get 2 apples.
How many apples does Jhon have?
I go to Garden.
Where am I?
```

These questions return 7 and Garden. Supported references include `I am`, `I'm`, `I have`, `I get`, `I give`, `I go`, `I like`, `I can`, `Am I`, `Do I`, `Can I`, `Where am I?` and personal description questions. A missing speaker prompts for a name. It does not create a logical variable named `I`.

Names accept one to four symbolic words, including lowercase input. `My name is Mary Jane.` stores the identifier `mary_jane`; later first-person statements use that identifier. Display capitalization is normalized. The latest introduction selects the current speaker, while previous facts about other names remain. A new session has its own speaker. Restart restores speaker evidence from SOP without replaying introductions. Resumed older sessions can use the new circuits immediately, but earlier unresolved introductions must be submitted again.

## Ask naturally within supported constructions

`Hello, I'm Jhon!`, `Call me Nora`, `You can call me Cora`, and `I am called Lina` are supported introductions. Greetings include `hello`, `hi`, `hey` and common time-of-day greetings. Thanks, farewells, questions about the assistant and several capability questions have conversational answers. The principal language remains English; a few greeting aliases do not establish multilingual understanding.

```text
Please, what is 7 plus 8?
Could you tell me if 8 is greater than 3?
Hi, Is Jhon human?
Can you help me?
```

Polite prefixes compose with supported tasks. Embedded copula questions are reordered into questions before execution, so `Tell me if Jhon is human` does not assert that Jhon is human. Supplied punctuation stays attached through rewrites. The rewrite chain is retained in structured results. At most four conversational rewrite levels are attempted within the normal execution budget.

## Ask for a calculation

```text
hwo much is 3 plus 5 ?
How much is 31 plus 17?
3+5
Calculate -3.5 times 2
Subtract 3 from 8
What is the sum of 8 and 11?
```

These return 8, 48, 8, -7, 5 and 19. The first request records the actual `hwo` to `how` lexical-repair assumption before computing. `/verbosity answer` displays only `8.` while retaining that evidence. `/examples 23` explains the scenario and `/example 23` runs it independently.

Arithmetic circuits combine request prefixes, signed numeric operands and operation words or symbols. Supported request forms include `how much is`, `how much are`, `what is`, `what's`, `calculate`, `compute`, `evaluate` and `work out`. Operators include `plus`, `minus`, `times`, `multiplied by`, `divided by`, `over`, `+`, `-`, `*`, `/`, `×` and `÷`. Imperative forms include `add A and B`, `multiply A by B`, `divide A by B` and `subtract A from B`; the last computes B minus A. `sum of A and B`, `the sum of A and B`, and `the product of A and B` are also supported. Spaces around symbolic operators are optional.

Typo repair uses the choices declared for a grammatical position. It accepts one edit, including adjacent transposition, in words of 3 to 32 letters when the nearest allowed meaning is unique. A proposal is usable only when the entire calculation fits the grammar. Numbers and arbitrary entity names are not spelling-corrected by this policy. Equal-distance alternatives with different meanings fail that lexical choice. Rejection prevents the same correction from silently recurring and invalidates saved results that depended on it.

A calculation accepts two decimal numeric operands and one operation. Signs use ASCII `+` and `-`; decimal fractions need a leading digit. Arithmetic uses JavaScript numbers, so floating-point precision applies. Parentheses, chains of operations, number words and measurement-unit conversion are outside these forms. `3 plus 5 plus 7` and `3 apples plus 5 oranges` remain unresolved; the reply preserves the detected numbers and suggests an arithmetic form. It does not calculate a convenient fragment while discarding the rest.

The earlier arithmetic path accepted forms such as `What is 3 plus 5?` but missed `how much is`, even when correctly spelled. The frozen school benchmark did not cover that wording or its typo. Separate paraphrase and repair tests now cover these interactions with varied operands. A passing fixed benchmark still does not establish unrestricted arithmetic English.

Capability and fallback messages are authored SOP text. They are guidance, not a learned choice of examples. General help now offers several task types; numerical gaps receive numerical guidance instead of an unrelated human/mortality example. The computed answer comes from the parsed operands and operation, never from a help string or evaluation answer table.

## Correct an interpretation

A speaker-reference assumption identifies the selected name and the stored relation used to resolve it. Facts asserted through that reference inherit the introduction's assumption dependencies. Rejecting a tentative name with `/reject a1` retracts unsupported identity and dependent facts and invalidates dependent saved values. An independently stated name or fact survives. Selecting a replacement name does not restore a previously replaced speaker when the new assumption is rejected; introduce the intended name explicitly.

The speaker is a conversation convention, not an authenticated account or proof of a person's real identity. Circuits store `introduced(name)` and the current `conversation_speaker(_conversation, name)` relation. These facts appear in inspection and exports. They are omitted from ordinary person summaries. This supports existing transactions, correction and session persistence without a separate hidden identity cache.

## When the request is outside the installed language

An unresolved request asks for context or suggests a usable form. Requests to write arbitrary prose or code, and requests for live weather, receive specific boundaries and a next step. Other recognized sentences in the same request still execute. For example, `Mia is human. Please write a novel about the moon. Is Mia human?` retains the fact and answers the final question.

The result remains `unresolved`, with a null semantic answer. Actual classified tokens remain under `gap.tokens` and in exported feedback; the ordinary reply no longer prints a parser diagnostic. Answer-only mode retains the concise `I don't know.` for these gaps. Operational errors and invalid rules still fail transactionally.

This is a circuit-defined conversation layer. It does not provide arbitrary pronoun resolution, general paraphrase understanding, a biographical database, web access or autonomous program generation. Unknown name-versus-attribute choices can be wrong. The separate conversation regression tests cover these workflows; the frozen elementary benchmark still measures its original 88 questions.
