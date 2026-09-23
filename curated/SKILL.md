---
name: ui-bank
description: Shaan's curated UI component bank (21st.dev picks with his verbatim notes + 300 rubric-rated candidates), with per-project presets (operator, models-app, landing). Use BEFORE building any UI component or screen for the Oracle streaming operator dashboard, the Oracle models app, or any SISO product — "which component should I use for X", "is there a comp for a login/chart/notifications/leaderboard/calendar/chat input", "A/B these comps", "open the bank", or when Shaan pastes 21st.dev URLs with reactions. Entry points are brief.mjs and registry/curated/query.mjs in siso-ui-base.
---

# ui-bank — the curated component bank

Lives in `~/SISO_Workspace/Great_Library_of_SISO/banks/siso-ui-base/registry/curated/` (README there is the contract).
The 7,949-corpus tools stay in `registry/21st/` (`find.mjs`); this skill is only the hand-picked layer.

## When Shaan pastes URLs with commentary

1. Split his stream into (url, verbatim reaction). Keep his words, do not paraphrase. If a
   comment plainly spans several URLs, copy it to each and say "(same note)".
2. Infer `--target` from the comment (operator-dashboard, operator-login, oracle-chat, models-app,
   landing, bank…) and `--signal` (love = "banging / oh shit / sexy / exactly what we needed",
   good = default, maybe = "don't know where", meh = "bit shit / bit extra").
   Standing rule: everything targets the operator dashboard unless he says otherwise.
3. `node registry/curated/add.mjs <url> --fb "..." --target x,y --signal love` per URL
   (or `--stdin` for a batch that shares one comment). It harvests preview/bundle/source itself.
4. Assign `type` (`family/kind`) by looking at the preview and the code, then `form`
   (mobile / desktop / either). Edit `picks.jsonl` directly for those two fields.
5. Open the board at http://127.0.0.1:8812/ and vote (`serve.mjs`)
   and arm a Monitor on the inbox. Never make him read the list in the terminal.

## When an agent needs a comp for a job

```bash
node brief.mjs "<thing>" --tenant oracle                       # bank is layer 1b of the brief, after DNA
node registry/curated/query.mjs "<thing>" --preset operator     # bank only; --surface dashboard|login|notifications|gamification|ai|vps|onboarding|calendar|nav|inputs
node registry/curated/query.mjs --presets                       # operator, models-app, landing, all (presets.json)
```
Curated rows carry `shaan_said`, `signal`, `vote`, `winner_of_type`; scout rows carry `bank_score`, `why`,
`ab_against`. Both carry local `preview`/`bundle`/`source` paths. A ★ or ✓ outranks any score.
Project pointer for the operator: `SISO_Agency/apps/oracle-operator/docs/UI-BANK.md`.
Read `feedback` before choosing; it says what he liked about it. Then read `bundle.html` or
`code.tsx` from the store pointers in the row. Adapt to the tenant DNA, never paste.

## Scouting the corpus for bank candidates

`scout/RUBRIC.md` is the bank-fit rating (craft, mechanism, product-fit, robbability, taste-match; 0-25;
≥19 surface to Shaan). Lanes + contact sheets come from `scout/build-lanes.py`; one agent per lane with
`scout/BRIEF.md`; `scout/merge.mjs` → candidates; Shaan votes on the board; `scout/promote.mjs` moves
kept ones into picks. Never promote without his keep vote.

## Authors / libraries he rated

`libraries.jsonl` — `adopt:true` rows are worth a full profile sweep; the `reusability` field is
his estimate ("ssicevs 50-70%", "aceternity 3-5%"). Cached library pages are in
`registry/21st/extras/library/`.

## Do not

- Don't re-scrape what `add.mjs --fill` reports as had. Don't dedupe the two 21st stores.
- Don't grep `harvest/` or load `catalog.json` into context.
- Don't spend the 2/day metered `21st get` calls; source comes from cdn.21st.dev or not at all.
