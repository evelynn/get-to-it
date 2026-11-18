# Defects to remove (shared)

The defect list for both skills: get-to-it (replies and reports) and long-form (documents, editing, translation). The goal is to convey the purpose and the content accurately and clearly. A defect changes the meaning, hides the point, or reads as machine-written.

## How to apply

- No word is banned. A match is a clue, not a reason to edit. Leave wording that reads naturally where it stands.
- Judge the paragraph, not the word. One use is fine; act when a pattern piles up.
- Accuracy comes before polish. If a fix would change the meaning, keep the original.
- Don't swap a correct formal word for a shorter casual one.
- Keep hedges and approved wording in medical, legal, policy and contract text.
- Don't add a new defect while fixing one: no new metaphor, contrast or cause.
- Work reports in company tone use status phrases and bullets by design. The rhythm and bullet items in section 3 don't apply to them.

## 1. Meaning changed

Keep exactly what the source or conversation says.

- Code, commands, paths, identifiers, placeholders, error text, quotes
- Numbers with their measurement conditions; dates, times, time zones, deadlines; prices, currencies, discounts and their conditions
- Product, plan, brand and personal names; established field terms
- Contract terms, eligibility, limits; refund, exchange, delivery and cancellation policy; warranty scope and exceptions
- Negation, exceptions, and qualifiers such as "only", "up to", "about", "less than"
- Certainty, in both directions: a possibility must not become a promise, and a commitment must not become a hedge
- Whether it is a request, an offer or a promise; completion state; who is responsible; the reason for a decision

Never add a fact, number, benefit, performance claim, testimonial, urgency, apology, thanks, promise or cause the source lacks.

- A check is not a finding. "Logs checked" is not "error found in logs".
- Don't join two things that merely happened together with "so". "The notice was edited yesterday. Inquiries dropped today." stays two facts.
- When sentences are merged, each fact keeps its own state, condition and time. A current state must not read as a future change.
- Keep boundaries. "Less than 10 minutes" is not "within 10 minutes".
- A missing value stays a placeholder such as `[warranty period]`. Don't fill it with a plausible one.

## 2. Point hidden

| Defect | Fix | Keep when |
| --- | --- | --- |
| The actor is buried in a noun: "a request was made", "a review was conducted" | Actor as subject, action as verb: "the customer asked", "Legal reviewed it" | The source names no actor (don't invent one). Status lines such as "Review done" |
| Four or more nouns in a row: "database readiness check location" | Add the small words or a verb: "where we check that the database is ready" | A fixed compound such as "customer satisfaction survey" |
| A word pairing nobody in the field uses: "session entry boundary" | The words people use, or the real name in the code: "just before login runs", "before `authMiddleware()` runs" | Common work terms and field terms |
| "This", "it", "the issue" with no single visible referent | Name the thing again | It points at the one thing just named |
| The point comes last, or the sentence loses nothing when deleted | Point first; delete the empty sentence | - |
| Abstractions and praise with nothing behind them: "aspect", "strategic", "effective", "various", "meaningful" | Name the decision, action, items or verified result behind the word | The abstraction is what is being analyzed, or the source gives the basis |
| A comparison or check with one side missing: "a mismatch", "there is a problem", "carefully reviewed" | Say what differed from what, or what was checked and how. If the source doesn't say, keep the claim narrow | It is clear from the sentences around it |
| An authority with no source: "experts say", "the industry agrees" | Name the supplied source or narrow the claim. Don't invent a source | A source is given nearby |
| Text that introduces itself: "This dashboard gives you an at-a-glance view of..." | Say what it shows | It adds a scope, limit or audience the title lacks |

Don't replace one vague noun with another. State the actual rule, check or result.

## 3. Machine-sounding

- Stock words: delve, leverage, utilize, robust, seamless, cutting-edge, game-changer, unlock, elevate, "plays a crucial role", "serves as". Use the plain word or say what the thing does.
- Signposts: "It's important to note that", "It's worth noting", "In conclusion", "Overall". Delete them and state the fact.
- Inflated endings: a last sentence that restates the point, draws a moral or predicts a bright future. End on the last fact or the next action.
- Contrast for emphasis: "not just X but Y", "more than X". State Y. Keep a contrast that corrects a real misunderstanding, once per text.
- Announcing a list: "There are three key aspects". Go straight to the content. Keep the number of items the source supports, not three by habit.
- Metaphors and oversized verbs: tapestry, landscape, journey, "revolutionizes", "transforms". State the fact and the work actually done.
- Stacked hedges and apologies: "might potentially", two apologies in one message. Keep one at the source's strength; never turn a hedge into a flat claim.
- Format: dashes for asides, emoji, bold inside sentences, scare quotes.
- Rhythm: every sentence or bullet the same length and shape. Join related points, split overloaded ones; never add content to vary rhythm.
- Continuous reasoning chopped into bullet fragments. Write it as a paragraph; use bullets where the content is a list.

## 4. Flow

- Read the paragraph before shortening it. Check what each sentence does to the one before: adds, contrasts, explains or follows.
- Use a link only for a relationship the source supports. "So" and "because" need a stated cause. "But" needs a real contrast. "Then" and "after" must not turn sequence into cause.
- Don't delete a link while shortening. Shorter is worse if the reader has to rebuild the connection.
- Don't leave a row of detached sentences. Join short sentences that share a subject and one thought.
- Don't open every sentence with a connector, or rotate synonyms to look varied.
- Don't add links between independent bullets, UI labels or deliberately clipped dialogue.
