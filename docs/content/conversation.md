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

## Solve a quantity problem across sentences

```text
/session new quantities
/verbosity explain
Jgon has 3 eggs. He received 4. How many eggs he has now?
/verbosity answer
How many eggs he has now?
He lost 2. How many eggs he has now?
```

The first problem computes 7. The following question displays `7.`, and the loss followed by a question displays `5.`. `/examples 24` shows the scenario; `/example 24` runs it in isolation and includes a saved-session restart. The same sentence forms work through the API and library. Restart the CLI process to load updated base circuits.

The first sentence stores the count of eggs for Jgon. The gain resolves He to Jgon and fills the omitted item with egg. Both choices are recorded before the update. The final question accepts the owner-before-has word order and records that normalization. Its structured result also retains the assumptions that caused the updated count. Eggs is registered inventory vocabulary; an unfamiliar item such as zibbles receives an item-classification explanation with its actual plural normalization, rather than a claim about a unary class.

| Input form | Interpretation |
| --- | --- |
| `Lina has 9 coins.` | Set Lina's current coin count to 9 |
| `She received 4.` | Select the recent compatible owner and fill the omitted item, then add 4 |
| `Lina received 4 coins.` | Add 4 to an explicitly named inventory |
| `She lost 2 coins.` | Select an owner with a recent coin count, then subtract 2 |
| `How many coins she has now?` | Normalize the word order and read the current count |
| `How many does Lina have left?` | Fill the most recent item for Lina |
| `How many coins are left?` | Fill the most recent owner with a coin count |
| `How many now?` | Fill both owner and item from quantity focus |

Set verbs include has, have, had and owns. Gains include gets, got, receives, received, gains, gained, finds, found, buys and bought. Losses include loses, lost, eats, ate, uses, used, spends, spent, sells, sold, gives and gave. The corresponding present first-person forms also work. A gain or loss can omit its item or use more before the item, as in `He received 4 more eggs.` Questions accept canonical does/do-have forms and the supported reordered forms above. These verbs update current state; past-tense wording does not create historical events. Signed numeric changes retain their supplied sign, and a loss verb negates that change. For example, received -2 subtracts two, while lost -2 adds two. Quantity owners are single identifiers; use `Mary_Jane` after a multiword introduction, or use I with the current speaker.

### Inspect the choices

Quantity focus remembers the sixteen most recent distinct owner/item pairs in the session. Successful sets, updates and queries move a pair to the front. Before choosing an antecedent, circuits re-read the live count. The focus contains identifiers, not an alternate cache of quantities. Failed updates do not change the order.

An explicit item narrows owner selection. After `Nora has 3 eggs. Cora has 9 coins.`, `She received 2 eggs.` selects Nora because the item matches her inventory. Without eggs, She selects Cora. With several eligible owners or items, the most recent wins. The assumption's evidence lists the selected quantity and eligible alternatives, so the choice can be inspected. He, she, they and it follow this recency rule; names do not establish gender. I and me use the introduced speaker instead.

Use `/assumptions` to inspect decisions and `/reject <id>` to reject one. If an update depended on that decision, its unsupported replacement count and dependent saved values are invalidated. The previous count is not reconstructed. State the corrected inventory explicitly, such as `Jgon has 3 eggs.`, before another change. Rejected or missing facts cannot supply a count merely because their identifiers remain in focus.

Quantity focus survives SOP session restart and stays separate across sessions. A full-history API client can resend a matching prefix without applying a received or lost amount twice. Older snapshots without focus need a new explicit quantity statement or query to establish it; historical messages are not replayed.

### Boundaries of this interpretation

With no usable owner or omitted-item context, the reply identifies the missing quantity information. An explicit gain without a starting count returns Unknown instead of assuming zero. Updates exceeding the available count keep the prior value. Strict parsing retains its exact forms and does not maintain conversational focus.

Recipients and transfers such as `Nora gave 2 eggs to Cora.`, comparative questions such as `How many more eggs?`, extra item clauses, number words and general narrative pronouns remain outside these forms. An update does not change another person's inventory implicitly. Answer-only mode suppresses successful update confirmations when the same request includes a successful quantity query; failures and standalone updates remain visible. Explained mode retains the intermediate answers.

The earlier failure on the Jgon example occurred after storing 3 correctly. The runtime had no quantity antecedent selection, omitted-item completion or matching final question form. Separate regression tests now cover these operations, competing contexts, changed names and values, rejection, rollback, restart and API history continuation. The frozen 88-case benchmark is unchanged.
