# Elementary knowledge

Fresh sdlm sessions include elementary facts and rules as SOP circuits. You can ask about familiar categories, needs, simple quantities, locations and relationships without first teaching every rule. The knowledge is visible under `circuits/foundation/bootstrap/`; `/kb` shows the resulting assertions and rules.

## Try the knowledge

```text
/example 17
/example 18
/example 19
/verbosity answer
Pip is a cat. Is Pip an animal?
Nori is a penguin. Can Nori fly?
What do eyes help us do?
What is 7 plus 8?
Mia has 5 apples. Mia gets 2 apples. How many apples does Mia have?
Mia is in Kitchen. Mia goes to Garden. Where is Mia?
```

The answers are `Yes.`, `No.`, `see`, `15.`, `7.` and `garden`. Binding lists use the existing list renderer, so their punctuation differs from numeric answers. `/examples 17` shows the scenario without executing it. Turn explanations back on with `/verbosity explain`.

## Covered domains

| Domain | Executable knowledge or operation | Boundary |
| --- | --- | --- |
| Animals | Familiar mammals, birds, insects and living things; sparrows can fly, penguins cannot | No default that all birds fly |
| Plants and materials | Plants need water and light; simple glass, metal, cotton, rubber and wood properties | Ordinary material models omit special treatments and exceptions |
| Senses and tools | Eyes help us see; pencils are used for writing; other registered purposes | A registered purpose is not a complete object model |
| Arithmetic | Addition, subtraction, multiplication and division of signed numeric tokens and decimals | Finite values with magnitude at most one trillion; division by zero returns Unknown |
| Quantities | Initial counts, gains, losses and eating; current count queries | One numeric value per entity and item; missing or impossible updates return Unknown; negative initial counts are unresolved |
| Space | Containment, left/right, on/under and explicit movement | Containment is transitive; current location is replaced when movement is stated |
| Order and calendar | Before/after, size and age comparisons; next/previous day or month | Calendar names form a cycle; there is no date arithmetic or duration model |
| Family | Parents, children, grandparents and explicit siblings | Shared parents do not automatically establish sibling relationships |
| Everyday causes | Hunger, thirst, tiredness and cold imply simple needs; warm ice melts | Rules are authored simplifications |
| Numeric comparisons | Greater, less and equal | No measurement-unit conversion |
| Evidence boundaries | Unknown, explicit negative support, contradiction and conditional defaults | Missing support does not mean false |

## State changes and defaults

`Mia is in Kitchen.` records one current direct location. `Mia goes to Garden.` replaces it; a later question about Kitchen returns Unknown unless another rule supplies support. Nested containment is recomputed from the new location. Quantity updates likewise replace the current count. State statements keep their supplied entity names. `Nora has 5 apples.` and `Cora has 3 apples.` create separate quantities; name-similarity guesses cannot merge these declarations or quantity updates. These operations do not retain an event timeline. ASCII signs are supported, for example `What is -2 plus 3?` returns `1.`. Other punctuation is preserved for parsing instead of silently changing a number; the Unicode minus sign is outside the numeric grammar.

```text
Poppy is outside. Poppy is in rain. Is Poppy wet?
Poppy has shelter. Is Poppy wet?
```

The first question can return a conditional Yes with an `everyday-default` assumption. The assumption is that no unmentioned protection prevents wetness. Its recorded premises must hold, and known shelter blocks the default. The runtime does not store a wet fact from that guess. The second question is Unknown unless wetness has independent support. Compact mode hides the explanation but retains the conditional answer and assumption in structured results.

## Source and continuation

`FoundationAnimals`, `FoundationPlants`, `FoundationMaterials`, `FoundationPurposes`, `FoundationNeeds`, `FoundationOrder`, `FoundationSpace`, `FoundationFamily` and `FoundationCalendar` contain the base assertions and rules. `School*.sop` circuits recognize sentence forms and construct typed commands. Quantity host operations perform generic arithmetic and functional relation updates. The VM contains no animal taxonomy, grammar for these sentences, or rain policy.

Library callers can pass `foundation: false` to `createSDLM` for an empty domain baseline. Grammar and response controls remain available. Examples 1 through 16 use this isolation to preserve their original explicit-knowledge scenarios; examples 17 through 20 enable base knowledge. The benchmark uses fresh sessions with base knowledge unless `--no-foundation` is supplied.

A saved session's knowledge snapshot is authoritative. Resuming an older snapshot preserves its original assertions and retractions; it does not silently add newly released base facts or rules. Start a new session to evaluate the complete base library. Session snapshots depend on the installed base circuit version and are not a general version-migration format.

The [evaluation guide](benchmark.html) measures these domains with an inspectable authored corpus. The [capabilities guide](capabilities.html) separates this bounded competence from unrestricted language understanding.

## Arithmetic wording

Conversation mode also accepts `How much is 3 plus 5?`, `3+5`, `Calculate -3.5 times 2` and `Subtract 3 from 8`. It can repair a nearby word such as `hwo` to `how`, with an explicit assumption, after recognizing the whole two-operand calculation. These forms are available with or without foundation facts. Run `/example 23` and read [Everyday conversation](conversation.html#ask-for-a-calculation) for operators, signs, precision and interpretation limits. Strict parsing retains its exact school forms.

## Quantity context

`Jgon has 3 eggs. He received 4. How many eggs he has now?` returns 7 in conversation mode. SOP selects the recent owner, fills the omitted item and records those decisions before applying the gain. `/example 24` demonstrates continuation, restart and a second inventory. Read [Quantity problems](conversation.html#solve-a-quantity-problem-across-sentences) for verb forms, competing antecedents and correction. A missing starting count remains Unknown, and rejecting an assumed replacement does not reconstruct an earlier count. Quantity focus stores a bounded recency order; current values remain ordinary knowledge.
