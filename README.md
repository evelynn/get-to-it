# get-to-it

**English** | [한국어](README.ko.md)

![A Claude Code reply before and after get-to-it](assets/preview-en.png)

A Claude Code plugin that answers in company tone: short business-report lines you can act on. The first line is the next step, steps are numbered, and AI filler gives way to the plain words people use at work.

It is for anyone who wants Claude to get to the point. English is the default. Korean has its own full rule set, including natural Korean without translated-sounding phrasing and Korean business-report style.

## Install

Takes about 2 minutes. You need Claude Code and Node.js. Without Node.js, a hook error is logged at each session start, but the session continues.

1. Install the plugin inside a Claude Code session.

   ```
   /plugin marketplace add evelynn/get-to-it
   /plugin install get-to-it@get-to-it
   ```

2. Open a new session (`/exit`, then `claude`) and turn the rules on.

   ```
   /get-to-it:get-to-it
   ```

3. Ask how to fix an error. It is on if the first line is the action to take.

To turn it on in every new session, create a flag file in your terminal. It applies from the next new session.

```bash
# macOS, Linux, Git Bash
touch ~/.claude/.get-to-it-always
```

```powershell
# PowerShell
New-Item -ItemType File "$HOME\.claude\.get-to-it-always"
```

## Language

English is the default. Korean has its own rule set for natural Korean and Korean company reports: [`references/ko/`](skills/get-to-it/references/ko)

1. For the current session only, say "Korean mode" or "English mode".
2. For every new session, write `ko` to `~/.claude/.get-to-it-lang`. Without the file, English is used. The file only works together with `.get-to-it-always`.

   ```bash
   # macOS, Linux, Git Bash
   echo ko > ~/.claude/.get-to-it-lang
   ```

   ```powershell
   # PowerShell
   Set-Content "$HOME.claude.get-to-it-lang" ko
   ```

## Company tone

Chat replies and work reports come as short status lines ("Fix done", "Restart needed") in everyday work words. Email, notices, README and docs keep their usual register. Rules: [`SKILL.md` chapter 3](skills/get-to-it/SKILL.md)

### How sentences change

| Ordinary sentence | Company tone |
| --- | --- |
| I checked the DB and fixed it. | DB checked, fix done |
| The cause is the cache. | Cause: cache |
| You need to restart the server. | Server restart needed |
| We'll deploy tomorrow. | Deploy scheduled for tomorrow |
| The cache might be the cause. | Possible cause: cache (needs checking) |
| Next: please paste the first failing line. | Next: first failing line requested |

### Report example

Written by hand to illustrate the rules.

Ordinary reply:

> I checked the login error. The cause looks like the cache, but that is not certain yet. Three tests failed, and we plan to deploy tomorrow.

Company tone:

> Login error checked
>
> Possible cause: cache (needs checking)
>
> 3 tests failed
>
> Deploy scheduled for tomorrow
>
> Next: first line of the failure log requested

## Examples

These examples are written by hand to illustrate the rules. Actual replies vary with the model and conversation.

### Example 1. Fixing an error

Request: I get a 401 when I log in. How do I fix it?

Before:

> Sure, let me take a look! The auth flow has several parts, so let's first dive into the structure: the middleware, token verification and cookie handling all play a crucial role. In conclusion, it might be worth modifying the token verification. By the way, your dependencies are also out of date. Hope this helps!

After:

> Fix needed: `verifyToken` in `src/auth.ts:42`
>
> Reason: request's `Authorization` header not read
>
> 1. Change line 42 to read the header.
> 2. Run `npm test -- auth.spec.ts`.
>
> Next: first failing line requested if a test fails

The first line is the action. The dependency topic waits until the current problem is done.

### Example 2. Long-running work

Request: Translate these 5 API documents into Korean.

Before:

> The translation is in progress. Please wait a moment and it will be finished soon.

After:

> Step 3/5 done: auth document translated. About 5 minutes left.
>
> Next: payment document translation scheduled

Progress is restated every time, and time is a number.

### Example 3. Hard-to-reverse work

Request: Delete all the old branches.

After:

> Confirmation needed before deleting
>
> Targets: 12 branches. `feature/payment` and `fix/login` not merged.
>
> Deleting them makes their commits hard to find.
>
> Next: choice requested between the 10 merged branches and all 12

Deletes, force pushes and schema changes get a confirmation first.

### Example 4. Plain words

| Before | After |
| --- | --- |
| Let's delve into the logs to ensure a seamless deployment. | Logs to check before deploy |
| It's important to note that environment variables play a crucial role in deployment. | Deploy depends on environment variables |
| We should leverage the existing cache layer in order to improve performance. | Existing cache reuse proposed for speed |
| In conclusion, it is the cache that is the cause. | Cause: cache |

## Turning it on and off

| Goal | How |
| --- | --- |
| Turn on for this session | Type `/get-to-it:get-to-it` |
| Turn off for this session | Say "normal mode" or "stop get-to-it" |
| Turn on for every new session | Create `~/.claude/.get-to-it-always` |
| Stop turning on for new sessions | Delete that file |
| Change language for this session | Say "Korean mode" or "English mode" |
| Set language for every new session | Write `ko` to `~/.claude/.get-to-it-lang` |
| Back to English | Delete `~/.claude/.get-to-it-lang` |

The language file only works together with the `.get-to-it-always` file. With the always-on file present, the rules are injected again after compaction or `/clear`, even if you turned them off during the session.

## License

MIT. See [`LICENSE`](LICENSE).
