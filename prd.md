# PRD — Aegis Wealth Intelligence Workbench
**SingHacks 2026 · Julius Baer Wealth Intelligence Challenge**
**Build window: one night. This PRD is scoped to that constraint, not the ideal version.**

---

## 1. Problem statement

Priscilla Ong is a Relationship Manager for 20 HNW/UHNW clients (USD 8m–88m AUM). Her current
tools are descriptive: they show her what a portfolio is worth *today*. They don't tell her what
changed, why it changed, what it's about to collide with, or what to say to the client about it.
That synthesis currently lives entirely in her head — which doesn't scale past a handful of
clients and doesn't survive her going on leave.

**Aegis turns five snapshots of raw portfolio data into the three things an RM actually needs each
morning:** who on my book needs me today, why, and what do I say to them.

## 2. Target user

Priscilla Ong — single persona, no multi-user requirement for this build. She is not a data
analyst; she needs conclusions, not dashboards. Every screen should answer "what should I do with
this" in the first five seconds, not require her to interpret a chart.

## 3. Goals (what "done" looks like tonight)

1. A ranked, book-wide view of all 20 clients by urgency — computed, not guessed.
2. Two clients (**Lau Chi Ming, CL-0014** and **Ravi Chandrasekaran, CL-0002**) with a full,
   defensible advisory narrative: what happened, traced to a real event; what it did to their
   numbers; what it collides with; and a drafted RM talking point she could actually send or say.
3. At least one interactive "what if" moment — a stress-test toggle that recomputes risk live in
   front of a judge, so the demo has a moment that isn't just reading a pre-written screen.
4. Zero invented causality, anywhere. Every "why" in the UI must trace to a real row in
   `event_log.csv`, and the UI must say so plainly when it can't find one — this is a *feature* to
   show off, not an edge case to hide.

## 4. Non-goals (explicitly out of scope tonight)

- Multi-user auth, login, roles, permissions.
- Persistent database / production data store. In-memory is fine for a judged demo.
- Full narrative build-out for all 20 clients — the brief itself says depth over breadth on 2–3
  clients wins; the other 18 exist in the triage view by the numbers only, no drafted narrative.
- Mobile layout, offline mode, multi-currency input, real bank system integration.
- General-purpose NLP for the behavioral-divergence detector — a targeted heuristic tuned for the
  two deep-dive clients is enough; it does not need to be a trained model tonight.

*(These aren't rejected ideas — they're listed so nobody spends 2am hours on them by accident.)*

## 5. Why these two clients (context for anyone new to the project)

- **Lau Chi Ming** — a slow-building, still-unresolved risk: the same underlying bet (Golden
  Harbour Properties) held four ways (stock, perpetual bond, accumulator, his own development
  business), a Lombard facility climbing steadily toward its margin-call trigger (53.9% → 69.4%
  against a 70% trigger), and a confirmed HKD 60m cash call due within 8 months against a portfolio
  that's mostly illiquid once you actually check.
- **Ravi Chandrasekaran** — a fully realized, dated event: an actual margin-call breach in June
  (75.64% vs. a 75% trigger), bracketed by two specific trades — one badly timed, one taken *after*
  the RM personally flagged the risk in her own notes and he proceeded anyway. Also a clean
  household-aggregation story: 68% of his wealth sits in one illiquid custody position that no
  mandate ever checks against, because custody accounts aren't managed.

Full numeric detail on both is in `design.md` §7 and in the team's existing data-analysis notes —
this PRD assumes that groundwork is already done; tonight is build, not discovery.

## 6. User stories

| # | As Priscilla, I want to... | So that... | Priority |
|---|---|---|---|
| 1 | See my 20 clients ranked by urgency the moment I open the app | I know who to call first without reading 20 files | Must |
| 2 | Click into Lau or Ravi and see their portfolio value change across all 5 snapshots | I can see the shape of what happened, not just today's number | Must |
| 3 | See *why* a value moved, tied to a real world event, not a guess | I can explain it to the client and trust it in a meeting | Must |
| 4 | See their true concentration once structured products are looked through | I don't miss a risk that's hidden inside a wrapper | Must |
| 5 | See what upcoming cash need they collide with, and whether they can actually fund it | I can raise it before it's a crisis, not after | Must |
| 6 | Get a drafted talking point or email I can send with light editing | I don't start from a blank page every time | Must |
| 7 | See a moment where what the client *said* conflicts with what they *did* | I walk into the conversation already knowing the real issue | Should |
| 8 | Nudge a macro variable (oil, rates, equities) and see risk recompute live | I can answer "what if this gets worse" on the spot | Should |
| 9 | See the same triage/narrative structure applied to any client, not just the two demoed | The tool reads as a platform, not two hardcoded case studies | Could |

## 7. Success metrics (for the demo, not production KPIs)

- A judge can ask "why did his LTV move" and get an answer that names a specific `event_log.csv`
  row, unprompted.
- A judge can ask "what if oil spikes another 20%" and see a number change within the same demo,
  live.
- The two client stories are distinguishable in kind, not just in name — one is "watch this, it's
  building," the other is "this already happened, and here's the exact moment the client overrode
  advice."

## 8. Demo script (own this — it's often worth more than the code)

1. **Open on the triage list** — 20 clients, urgency-ranked. "This is Priscilla's whole book,
   scored the moment she logs in. No client-by-client digging."
2. **Click Lau.** Walk the 5-snapshot chart: LTV climbing, collateral value falling. Click the March
   event pin — Strait of Hormuz closure — then show the transaction one day later: a forced
   drawdown to cover the accumulator. "The system didn't guess that connection — it's a real
   transaction, dated, right after a real event."
3. **Show the look-through view.** Same name, three instruments, plus his own business. "Balanced
   mandate caps single positions at 12%. He's at 29% once you look through the wrapper."
4. **Pull the stress toggle.** Push oil up another notch, or push equities down. Watch his headroom
   shrink live. "This is what 'what if it gets worse' looks like, computed, not narrated."
5. **Click Ravi.** Show the breach — LTV actually crossed 75% in June. Show it recover by August —
   "but the loan balance never moved. The market cured this, not him." Show the behavioral card:
   the RM's own note flagging the risk, and the trade he made three days later anyway.
6. **Click "Draft talking points."** Show the generated script, grounded, citation-backed, editable.
7. **Close on the triage list again.** "Every client on this list has this available. Tonight we
   built the two that matter most — the engine underneath already sees all twenty."

## 9. Judging-criteria alignment (explicit, so nobody forgets to say it out loud)

- **Client-Centric Innovation** — the behavioral-divergence card and the liquidity-collision framing
  are things a human RM would actually think, not generic BI.
- **UX & Design** — one triage view, one deep-dive view, one action panel. No more than that.
- **Technical/Operational Feasibility** — deterministic math kept strictly separate from the one LLM
  call; the system can explain and audit every number it shows, live, on request.
- **Strategic Impact** — book-wide prioritization is a byproduct of the same deterministic engine
  that powers the two deep dives, at zero marginal LLM cost.

## 10. Risks specific to a one-night build

| Risk | Mitigation |
|---|---|
| Live LLM call fails/lags on stage | Pre-generate and cache the Advisory Synthesis output for Lau and Ravi ahead of time; live call is a bonus, cached version is the floor |
| Running out of time on polish | Build in the strict order in `design.md` §9 — narrative correctness before visual polish |
| Scope creep (auth, DB, more clients) | Anything not in §3 Goals does not get built tonight, full stop |
| A number is wrong in front of a judge | Every displayed figure must be traceable to a raw CSV value shown in `design.md` §7 — no numbers invented for effect |