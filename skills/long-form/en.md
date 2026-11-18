# long-form (English)

Convey the purpose and the content accurately and clearly, in the register a company would use for that reader. Accuracy comes before polish: many users cannot check the result against the source themselves. Passing an AI detector is not a goal.

## 1. Identify the task

| Input | Task |
| --- | --- |
| A request to write | Decide who reads it, what they already know and what they should do after reading. Then write. |
| Text to polish | Keep the voice, structure and register. Change only the passage the request covers, and only where it does not work. |
| A source and a draft translation | Check the draft against the source, fix drift, then fix awkward wording. Keep draft sentences that are accurate and natural. |
| A source only, translation requested | Build each sentence in the target language's order. Merge, split or reorder when it reads better, keeping every fact and condition. |

When the source and the draft disagree on a price, date, limit, policy or promise, don't silently pick one.

- The user named one version as approved or current: follow it.
- The draft clearly mistranslates, such as a dropped exclusion or a softened "only": fix it and say so in one line.
- It is unclear which governs and the choice changes commercial terms: ask one question, or keep the clause and mark it unresolved.

## 2. Write

- Work out the audience, channel and register from the request, the text and any existing copy. Existing strings, brand samples and style guides outrank defaults. Professional does not mean stiff, and natural does not mean casual.
- Put the reason for writing and the request near the top. One idea per paragraph, one term for one thing.
- No intro that repeats the title and no closing recap.
- When the source gives no action, result or reason, keep the claim narrow or flag the gap.
- **Email, notices, support replies.** Greeting and close in proportion to the relationship. Keep the apology level, every commitment, and each policy limit with its exception. Say what the reader can do.
- **Ads and product pages.** Keep each offer next to its condition and deadline. No added urgency, scarcity, superlatives or social proof.
- **UI copy.** Keep placeholders, variables, keys and markup exactly. A button names the action it performs, and the body keeps the real outcome, such as a permanent deletion or a charge.
- **Code review.** Comment on the code, not the author, with a concrete suggestion.
- **Personal messages and dialogue.** Keep the writer's voice. Don't turn it into company tone.

## 3. Keep the meaning

Keep exactly what the source or conversation says.

- Code, commands, paths, identifiers, placeholders, error text, quotes
- Numbers with their conditions; dates, times, deadlines; prices, discounts and their conditions
- Product, plan, brand and personal names; established field terms
- Contract terms and limits; refund, delivery and cancellation policy; warranty scope and exceptions
- Negation, exceptions, and qualifiers such as "only", "up to", "about", "less than"
- Certainty, in both directions: a possibility must not become a promise, and a commitment must not become a hedge
- Whether it is a request, an offer or a promise; completion state; who is responsible

Never add a fact, number, benefit, urgency, apology, thanks, promise or cause the source lacks. This also holds for any sample or alternative you offer.

- A check is not a finding. "Checked the logs" is not "found the error in the logs".
- Don't join two things that merely happened together with "so". "The notice was edited yesterday. Inquiries dropped today." stays two facts.
- Keep boundaries. "Less than 10 minutes" is not "within 10 minutes".
- A missing value (a price, a period, what a button does) stays a placeholder such as `[warranty period]`. Write everything else the source supports and ask one question per missing fact.
- Don't convert currencies, time zones or units unless the user asks and gives the basis. Local date and number formats are fine.

## 4. Edit only with a reason

An edit to supplied text needs a problem you can name: a meaning or fact error, broken grammar, phrasing the reader would notice as translated or machine-written, or a register that does not fit.

- No word is banned. A match in section 5 is a clue, not a reason. Leave wording that reads naturally where it stands, and act when a pattern piles up in a paragraph.
- A synonym swap, a trimmed word, or proof that something was edited is not a reason. Text that already reads naturally goes back unchanged.
- If a fix would change the meaning, keep the original. Don't swap a correct formal word for a shorter casual one. Keep hedges and approved wording in medical, legal, policy and contract text.
- If you changed more than 30%, not counting removed filler, scale back. Change structure or write new passages only when asked.
- Don't add a new defect while fixing one: no new metaphor, contrast or cause.

## 5. Defects

| Defect | Fix | Keep when |
| --- | --- | --- |
| The actor is buried in a noun: "a request was made" | Actor as subject, action as verb: "the customer asked" | The source names no actor. Don't invent one |
| Four or more nouns in a row, or a pairing nobody in the field uses: "session entry boundary" | The words people use, or the real name in the code: "just before login runs" | A fixed compound or field term |
| "This", "it", "the issue" with no single visible referent | Name the thing again | It points at the one thing just named |
| The point comes last, or the sentence loses nothing when deleted | Point first; delete the empty sentence | - |
| Abstractions and praise with nothing behind them: "strategic", "effective", "various" | Name the decision, action or verified result behind the word | The source gives the basis |
| A check or comparison with one side missing: "a mismatch", "carefully reviewed" | Say what differed from what, or what was checked and how | It is clear from the sentences around it |
| An authority with no source: "experts say" | Name the supplied source or narrow the claim | A source is given nearby |

Machine-sounding wording:

- Stock words and signposts: delve, leverage, robust, seamless, "plays a crucial role", "It's important to note that", "In conclusion". Use the plain word or state the fact.
- Inflated endings: a last sentence that restates the point, draws a moral or predicts a bright future. End on the last fact or the next action.
- Contrast for emphasis ("not just X but Y") and announced lists ("There are three key aspects"). State Y and go straight to the content.
- Metaphors and oversized verbs: tapestry, journey, "revolutionizes". State the work actually done.
- Stacked hedges and apologies. Keep one at the source's strength; never turn a hedge into a flat claim.
- Format and rhythm: dashes for asides, emoji, bold inside sentences, every sentence the same shape, reasoning chopped into bullet fragments.

Flow:

- Use a link only for a relationship the source supports. "So" needs a stated cause and "but" a real contrast. "Then" must not turn sequence into cause.
- Don't delete a link while shortening. Shorter is worse if the reader has to rebuild the connection.
- Join short sentences that share a subject and one thought. Don't add links between independent bullets or UI labels.

## 6. Return the result

- Lead with the text, ready to paste, with nothing before it.
- A simple edit or translation, or text that was already natural: the text alone. No verdict and no list of edits.
- Corrected drift or another material discrepancy: one or two sentences naming the actual difference.
- A missing fact or an unresolved version: the placeholder stays visible, followed by the question that settles it.
- Write notes and questions in the language of the request. Don't offer other tones or versions unless asked.

## Final check

1. Every claim, condition, number, name and placeholder is present and unchanged. Nothing was added.
2. Negation, qualifiers, certainty, and request versus promise match the source.
3. Links of cause, contrast and order survive, and none was invented.
4. Every edit has a reason. Revert the ones that don't.
