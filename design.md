# Design — Aegis Wealth Intelligence Workbench
**Rescoped for a one-night build.** Keeps the agentic pipeline concept — it's genuinely the right
shape for the zero-hallucination requirement — but cuts every piece of infrastructure that buys
"production readiness" instead of demo strength: no vector DB, no external managed database, no
auth. Single deployable backend, single frontend, in-memory data.

---

## 1. Why this is still "agentic," not just a script

An agentic pipeline earns its name from **strict contracts between specialized steps**, not from
how many servers it runs on. This design keeps that: five specialized agents, each with a typed
input and typed output, orchestrated in a fixed sequence — and critically, **only one of the five
ever touches an LLM.** That's the actual architectural point (deterministic math and lookups feed a
narrator that can't invent facts), and it's true whether it runs as five microservices or five
Python functions in one process. Tonight, it's the latter — same contract, a fraction of the
infrastructure risk.

```
Agent 1: Forensic Structuring   →  Agent 2: Causal Attribution  →  Agent 3: Behavioral Reconciler
  (deterministic)                    (deterministic lookup)          (deterministic heuristic)
        │                                    │                              │
        └──────────────────┬─────────────────┴──────────────────┬──────────┘
                            ▼                                    │
                  Agent 4: Scenario Simulator                    │
                     (deterministic, on-demand)                  │
                            │                                    │
                            └───────────────────┬────────────────┘
                                                 ▼
                                  Agent 5: Advisory Synthesis
                                    (the ONLY LLM call — Claude)
```

Agents 1–4 run for **all 20 clients** at backend startup (cheap — no LLM, pure pandas/Python, runs
in well under a second). Agent 5 runs **on demand, per client, only when Priscilla asks for it** —
this is what keeps live-demo latency and failure risk low: the expensive, fallible step is the one
step that's optional and cacheable.

---

## 2. Tech stack (deliberately boring)

- **Backend:** Python, FastAPI, pandas. Data loaded from the competition's raw CSV/JSON files into
  in-memory DataFrames at startup — **no database.** This alone probably saves 2–3 hours versus a
  Postgres/Supabase setup, and removes an entire category of demo-night failure (migrations, env
  vars, connection strings, RLS policies).
- **Frontend:** React + Vite + Tailwind. No custom design-system tooling beyond Tailwind's own
  config — spend visual effort on the dark/gold theme via CSS variables, not build tooling.
- **LLM:** Anthropic API, one model, one system prompt, called only by Agent 5.
- **Hosting:** run locally for the demo (most reliable option on unpredictable venue wifi). If time
  allows in the last hour: one Vercel deploy for the frontend, one Render/Fly deploy for the
  backend. This is explicitly a stretch goal, not a dependency for judging.
- **No auth, no vector DB, no ORM.** All three are correct engineering for a real product and wrong
  effort allocation for tonight.

---

## 3. Data layer

Load once at startup, keep in memory:

```
clients_df, portfolios_df, holdings_df, instruments_df, mandates_df,
transactions_df, credit_facilities_df, commitments_df,
planned_cash_needs_df, market_context_df, event_log_df, rm_notes (list of dict)
```

**FX normalization (do this once, at load time, not per-request):** for every portfolio, convert
each `aum_<date>` and every holding `market_value` at each snapshot into USD using
`market_context.csv`'s FX row for that exact `snapshot_date`. Watch the quoting convention —
`USDHKD`/`USDSGD`/`USDJPY`/`USDCHF`/`USDCNH`/`USDIDR`/`USDTHB`/`USDINR` are foreign-per-USD (divide
local by rate to get USD); `EURUSD`/`GBPUSD` are USD-per-foreign (multiply). Get this wrong and
every downstream number is wrong — write one conversion function, unit-test it against the two
known client AUM figures (Lau ≈ USD 26.49m, Ravi ≈ USD 46.70m) before building anything on top of
it.

---

## 4. Agent 1 — Forensic Structuring (deterministic)

**Input:** `client_id`. **Output:** a single JSON object per client — this is the object every other
agent and the frontend consumes.

Computes, per client, aggregated across all their portfolios:
- USD-normalized AUM at each of the 5 snapshots (household total, not per-portfolio)
- Look-through concentration: group holdings by `instruments.underlying_reference` (falling back to
  `instrument_name` where underlying_reference is null), sum weight, compare against the relevant
  `mandates.csv` limit for that asset class/mandate — **flag any name where the look-through weight
  exceeds the limit, even if no single instrument does on its own**
- Liquidity runway: sum market value by `liquidity_tier` (Daily/Weekly/Illiquid), compare against
  `planned_cash_needs.csv` rows due within the current window, sorted by `certainty` and due date
- **Corrected ACaR** (see §6 — this replaces the earlier flawed version)
- Composite Urgency Score (see §6)

## 5. Agent 2 — Causal Attribution (deterministic lookup, NOT vector search)

This replaces the ChromaDB/embedding approach from the earlier draft. With 16 hand-labeled events,
a similarity-scored vector search adds dependency risk and non-determinism for zero accuracy gain.
Use a plain rule match instead:

**Match rule:** for a given portfolio movement between two snapshots, find `event_log.csv` rows
where `event_date` falls between the two snapshot dates, AND the event's described
region/asset/transmission-channel overlaps the instrument's `asset_class`/`sub_asset_class`/region.
Keep the match set small and explicit (a lookup table of asset_class → relevant event keywords is
enough — you already know the 16 events, hand-map the obvious ones: energy/oil events → Energy,
Gulf-credit holdings; tech drawdown event → US Technology holdings; rate-hold events → long-duration
fixed income; gold events → precious metals).

**Critical behavior:** if no event matches, the agent returns `"verified_cause": null` explicitly —
**the frontend must render "no verified market event found for this move" rather than staying
silent or letting Agent 5 guess.** This is the actual zero-hallucination gate, and it's worth
calling out to judges as a deliberate, visible feature, not a limitation.

## 6. Corrected formulas

**ACaR (Absolute Capital at Risk)** — the earlier draft multiplied the LTV gap by raw collateral
market value. That overstates the dollar figure, because LTV in this dataset is `drawn /
lending_value` (lending_value is already collateral net of the bank's haircut) — verified against
Ravi's actual June 30 breach: the raw-market-value version gives $91,573 "at risk," but the actual
dollar paydown required to cure the breach back to trigger is $54,762. **Use lending_value, not
collateral market value:**

```
ACaR = max(0, lending_value_current × (LTV_current − LTV_trigger))
     + max(0, planned_liability_due_soon − liquid_assets_available)
```

**Composite Urgency Score (U, 0–100):**
```
U = 0.40 × (LTV_current / LTV_trigger)
  + 0.30 × (look_through_exposure / mandate_limit)
  + 0.30 × normalize(ACaR)     # scaled 0–1 across the 20-client book
```
Both terms floor at their natural minimum (an under-levered or under-concentrated client
contributes a small but non-zero baseline, not a hard 0, so the ranking stays continuous).

## 7. Agent 3 — Behavioral Reconciliation (heuristic, tuned for the two deep-dive clients)

Not a trained model tonight — a targeted heuristic: for each RM note, find any transaction on the
same `portfolio_id` within a small date window (e.g. ±10 days) and flag when the note's sentiment
(simple keyword check — "flagged," "concerned," "agitated," "advised against," "cautioned") doesn't
match the transaction's direction (e.g. a drawdown/subscription right after a note expressing
concern). This is exactly what surfaces Ravi's June 8 leveraged drawdown three days after his own
agitation was logged, and Lau's March 5 forced drawdown the day after the Strait of Hormuz closure.
Write it as a general function (it can run across all 20 clients for free), but only verify its
output by hand for Lau and Ravi — don't spend time tuning it for clients you're not demoing.

## 8. Agent 4 — Scenario Simulator (deterministic, on-demand)

Takes the Agent 1 output plus a small set of scalar shocks (`energy_pct`, `equity_pct`,
`rate_bps`) and recomputes affected holdings' market values, then re-derives LTV/ACaR/Urgency
using the same formulas as Agent 1. No LLM. This is what powers the live "push the toggle" demo
moment — keep the shock set small (2–3 sliders) rather than building a general macro model; the
demo only needs to prove the number visibly moves and the reasoning is traceable, not that the
model is econometrically rigorous.

## 9. Agent 5 — Advisory Synthesis (the only LLM call)

**Input:** the full JSON output of Agents 1–4 for one client — nothing else. **System prompt must
state explicitly:** only use facts present in the provided JSON; every causal claim must cite the
`event_id` it came from; if `verified_cause` is null for a move, say so rather than speculating; use
the RM's own tone from `rm_notes.json` as a style reference but never invent a note that doesn't
exist. Output: a short structured talking-points list plus one drafted email/call-opener.

**Demo-night safety net:** pre-generate and cache this output for Lau and Ravi (and for the two
main stress-test scenarios you plan to demo) well before presenting. Wire the "Draft talking
points" button to call the live API by default, but keep the cached version ready to swap in
instantly if the live call is slow or fails on venue wifi.

---

## 10. API surface (minimal)

```
GET  /clients                       → Agent 1 output for all 20, list view (triage feed)
GET  /clients/{id}                  → Agent 1 + Agent 2 + Agent 3 output for one client (deep dive)
POST /clients/{id}/scenario         → body: {energy_pct, equity_pct, rate_bps} → Agent 4 output
POST /clients/{id}/advisory         → Agent 5 output (live or cached)
```

Four endpoints. That's the whole backend surface for tonight.

---

## 11. Frontend structure (three screens, not more)

1. **Triage view** — sortable table/cards, all 20 clients, urgency badge (Critical/Warning/Stable),
   one-line reason each (e.g. "LTV 69.4% vs 70% trigger").
2. **Client deep-dive** (Lau / Ravi, and functionally works for any client) —
   5-snapshot chart with event pins, look-through concentration bars against mandate limit,
   liquidity-vs-liability comparison, behavioral divergence card if flagged, scenario sliders.
3. **Advisory panel** — drafted talking points / email, with a visible citation back to the
   specific numbers and event IDs that produced it, copy button.

Dark theme via a handful of CSS variables (background, card surface, accent, text) is enough to
land the "sovereign fintech" look without a design-system build.

---

## 12. Hour-by-hour build plan (one night, ~10 working hours assumed)

| Hours | Work |
|---|---|
| 0–1 | Load all CSVs/JSON into pandas at startup; write + unit-test the FX conversion function against Lau/Ravi's known AUM |
| 1–2.5 | Agent 1: aggregation, look-through concentration, liquidity runway, corrected ACaR, Urgency Score — run for all 20, print/inspect output |
| 2.5–3.5 | Agent 2: hand-build the asset-class → event lookup table (16 events, do this by hand, it's fast and it's correct); verify it fires for Lau's March event and Ravi's June event |
| 3.5–4.5 | Agent 3: behavioral heuristic; verify it catches the two known cases |
| 4.5–5 | Agent 4: scenario shock recompute |
| 5–5.5 | Wire the 4 API endpoints |
| 5.5–7.5 | Frontend: triage view + deep-dive view, wired to real API responses (no styling polish yet) |
| 7.5–8.5 | Agent 5 prompt + integration; **generate and cache the Lau/Ravi outputs now**, don't leave this to the last hour |
| 8.5–9.5 | Visual polish: theme, chart styling, badges |
| 9.5–10 | Full demo run-through, timed, using the cached Agent 5 fallback path — fix whatever breaks |

**Rule for the night:** if something in §12 is behind schedule, cut from the bottom of the table
first (polish, then stress-test sliders), never from the top (the FX correctness and the two
client narratives are the whole point).

---

## 13. Explicitly deferred (do not start these tonight)

Supabase/Postgres persistence · JWT auth / RLS · vector DB / embeddings-based event matching ·
multi-tenant support · general behavioral-divergence NLP beyond the two deep-dive clients · mobile
layout · production deployment hardening.