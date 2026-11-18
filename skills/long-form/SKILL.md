---
name: long-form
description: 'Company-tone documents, email, notices and UI copy, plus editing and translation that keep every fact of the source. Use when asked to write, polish, proofread, localize or translate such text. Short replies and work reports belong to the get-to-it skill.'
license: MIT
---

# long-form

Convey the purpose and the content accurately and clearly, in the register a company would use for that reader. Accuracy comes before polish: many users cannot check the result against the source themselves. Passing an AI detector is not a goal.

`${CLAUDE_SKILL_DIR}` is the folder that holds this file. Before you write anything, read the files for the language of the result. They are part of this skill, not optional background.

- Korean text, or translation into Korean: both `${CLAUDE_SKILL_DIR}/references/ko.md` and `${CLAUDE_SKILL_DIR}/../../shared/defects.ko.md`
- Any other language: `${CLAUDE_SKILL_DIR}/../../shared/defects.md`

Work reports and status updates follow get-to-it's company tone (`${CLAUDE_SKILL_DIR}/../get-to-it/SKILL.md`, chapter 3), not this skill. When get-to-it is on, its reply-shape rules cover only the message that hands over the result, not the result.

## 1. Identify the task

| Input | Task |
| --- | --- |
| A request to write | Decide who reads it, what they already know and what they should do after reading. Then write. |
| Text to polish | Keep the voice, structure and register. Change only the passage the request covers, and only where it does not work. |
| A source and a draft translation | Check the draft against the source, fix drift, then fix awkward wording. Keep draft sentences that are accurate and natural. The source is the version the user names, or the original language if they name none. |
| A source only, translation requested | Build each sentence in the target language's order. Merge, split or reorder when it reads better, keeping every fact and condition. Don't aim for word-for-word match or minimal change from a machine translation. |

When the source and the draft disagree on a price, date, limit, policy or promise, don't silently pick one.

- The user named one version as approved or current: follow it without asking again.
- The draft clearly mistranslates, such as a dropped exclusion or a softened "only": fix it and say so in one line.
- It is unclear which governs and the choice changes commercial terms: ask one question, or keep the clause and mark it unresolved. Don't present it as verified copy. A local price or tax note does not by itself show the translation was approved.

## 2. Read the situation

Work out the audience, the channel, the register and what the reader should do next from the request, the text and any existing copy.

- Professional does not mean stiff, and natural does not mean casual.
- Existing strings, brand samples and style guides outrank defaults. A default fills a gap; it never justifies changing text that is already coherent. Use it without mentioning it.

## 3. Write

- Write the first version to the final standard. Don't plan a draft and a rewrite.
- Put the reason for writing and the request near the top. One idea per paragraph.
- Use one term for one thing. Explain a needed specialist term once.
- No intro that repeats the title, no closing paragraph that recaps.
- When the source gives no action, result or reason, keep the claim narrow or flag the gap. Use the writer's samples for tone, never as a source of facts.
- Make images or diagrams only when asked.

## 4. Protect facts and commitments

Section 1 of the defect list applies in full, including to any sample, template or alternative you offer. In addition:

- Don't convert currencies, time zones or units, or substitute local legal terms, unless the user asks and gives the basis. Local date and number formats are fine.
- When a material fact is missing (a price, a period, what a button does), still write everything the source supports. Leave only that field as a placeholder and ask one question per missing fact. Don't ask about things that would matter only if the content grew.
- In UI strings, keep placeholders, variables, keys and markup exactly, and add none. A button names the action it performs, and the body keeps the real outcome, such as a permanent deletion or a charge. Keep labels short.

## 5. Stop when the text works

An edit to supplied text needs a problem you can name: a meaning or fact error, broken grammar, phrasing the reader would notice as translated or machine-written, or a register that does not fit the genre.

- A synonym swap, a trimmed word, or proof that something was edited is not a reason. Keep the original.
- Text that already reads naturally goes back unchanged.
- If you changed more than 30%, not counting removed filler, scale back.
- Change structure, select different material or write new passages only when asked.

## 6. By genre

- **Email.** Address the reader the way the relationship expects. Greeting and close in proportion. No invented urgency, references or results.
- **Notices and support replies.** Plain and formal. Keep the apology level, every commitment, and each policy limit with its exception. Say what the customer can do.
- **Ads, landing and product pages.** Follow the brand's register. Keep each offer next to its condition and deadline. Spec tables and labels stay short noun phrases. No added urgency, scarcity, superlatives or social proof.
- **Documents and READMEs.** Say what the thing does and how to use it. No summary paragraph that repeats its heading.
- **Code review.** Comment on the code, not the author. Give a concrete suggestion instead of "room for improvement". Don't soften it until the requested change is unclear.
- **Chat messages.** Short, without chopping one thought into fragments. Match the relationship, not the medium. No added emoji, slang or closeness.
- **Public posts.** Open with the actual observation or result. Numbers keep their scope. No bait and no "What do you think?". If it is unclear whether internal paths or non-public details may be published, flag them.
- **Not business writing** (personal messages, dialogue): keep the writer's voice, relationship and feeling. Don't turn it into company tone.

## 7. Return the result

- Lead with the text, ready to paste, with nothing before it. Keep string keys, subject fields, list items and intentional line breaks.
- A simple edit or translation, or text that was already natural: the text alone. No verdict such as "nothing to fix", no list of edits, no confirmation that numbers were kept.
- Corrected drift or another material discrepancy: one or two sentences naming the actual difference, such as a dropped condition or an added promise.
- A missing fact or an unresolved version: the placeholder stays visible in the text, followed by the question that settles it.
- Write notes and questions in the language of the request, so a user who cannot read the target language can answer. Don't offer other tones or versions unless asked.

## Final check

Compare the result with the source. If a check fails, restore that sentence and rewrite it once.

1. Every claim, condition, number, name and placeholder is present and unchanged. Nothing was added.
2. Negation, qualifiers, certainty, and request versus promise match the source, along with who is responsible and why.
3. Links of cause, contrast and order survive, and none was invented.
4. The register is consistent and fits the reader and channel.
5. Every edit has a reason. Revert the ones that don't.
6. The user could paste it as it is.
