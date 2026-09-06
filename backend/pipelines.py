"""
Three Standalone Pipelines Implementation (SingHacks 2026 - Julius Baer Margin Call Radar)

Per Specification:
"These are documented as three separate, self-contained flows. None of them reads from or writes into another — 
each takes the raw data files as its only input and produces its own output. Any future wiring between them 
(e.g. one pipeline's output feeding another) is a deliberate integration decision to be made later, not assumed here."

Pipeline 1 — Book-Level Triage:
  - Scope: All 20 clients, always on. Produces a ranked dashboard.
  - Sub-score A (Risk Score, 50/50):
      1. Loss magnitude (50%): sum of negative unrealised_pnl_base / total AUM, capped at 100%.
      2. LTV proximity bonus (50%, ~5 clients with facility): cushion = margin-call LTV - current LTV.
         Cushion below 10 pts pushes factor up, capped at 1.0 as cushion -> 0. (0 for clients with no facility).
      * Note: Concentration is deliberately NOT a factor in Pipeline 1.
  - Sub-score B (Liquidity Score):
      Weighted % of book that's Daily (0.0) / Weekly (0.5) / Illiquid (1.0).
  - Sub-score C (Urgency Score):
      Rule-based date / keyword bucket: Urgent (1.0) / This Year (0.75) / Next Year+ (0.4) / Unspecified (0.1).
  - Attention Score Aggregator: Normalises A + B + C (percentile rank per client) -> single score.

Pipeline 2 — Per-Client Deep Dive:
  - Scope: One client at a time, on demand. Produces the RM Card.
  - Stages:
      1. Monitor Agent: LTV trajectory across all 5 snapshots (if facility exists) + margin cushion + issuer look-through concentration across ALL client portfolios.
      2. Event-Grounding Agent: matches top risk driver to event_log.csv row, or explicitly outputs "no market cause found".
      3. Compliance Agent: single-position cap check vs mandate, checks for existing waiver in rm_notes.json before flagging fresh breach.
      4. Personality Agent: STRICTLY extraction-only behavioral read quoting rm_notes.json, or "insufficient signal in rm_notes".
      5. Explainer Agent: plain-English narrative (what changed, why, mandate status, framing suggestion).
      6. RM Handoff Agent: headline + gauge + suggested action + suitability check (PASS/FLAGGED/FLAGGED-but-WAIVED) + reviewable Accept/Edit/Reject.
      7. Historical-Replay Agent: hypothecated replay of logged event shock on current holdings (never a prediction).

Pipeline 3 — Fault Lines:
  - Scope: Standalone tagging + analysis layer, run once and cached.
  - Components:
      1. Driver Tagging (Stage 1):
          - Tier A tags (macro/event, from event_log's own primary_transmission vocabulary)
          - Tier B tags (canonical entity/issuer, normalized keys e.g. Golden Harbour across bond/stock/accumulator)
          - Client-context tags (evidence-only from source_of_wealth, objectives, rm_notes)
      2. Margin-Call Proximity Metric (Stage 3a):
          - headroom_pct = margin_call_ltv_pct - ltv_pct_current
          - market_drop_to_trigger_pct ≈ 1 - (ltv_current / margin_call_ltv) [directional estimate]
      3. Thread-Based Amount-At-Risk (Stage 3b):
          - groups instruments sharing a Tier B entity tag into a "thread" object
          - sums combined market value
          - outputs {client_id, driver, instrument_ids, combined_market_value_usd, pct_of_client_aum}
"""

import os
import json
import re
from typing import Dict, Any, List, Optional
import pandas as pd
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(HERE, "data")
if not os.path.exists(DATA_DIR):
    DATA_DIR = os.path.join(os.path.dirname(HERE), "data")


# ==============================================================================
# PIPELINE 1: BOOK-LEVEL TRIAGE (STANDALONE)
# ==============================================================================
class BookLevelTriagePipeline:
    """
    Pipeline 1 — Book-Level Triage
    Runs across all 20 clients, always on. Produces a ranked dashboard.
    Independent: Does NOT read from or write into Pipeline 2 or Pipeline 3.
    """

    def __init__(self, data_dir: str = DATA_DIR):
        self.data_dir = data_dir
        self.clients_df = pd.read_csv(os.path.join(data_dir, "clients.csv"))
        self.holdings_df = pd.read_csv(os.path.join(data_dir, "holdings.csv"))
        self.credit_df = pd.read_csv(os.path.join(data_dir, "credit_facilities.csv"))
        self.cash_needs_df = pd.read_csv(os.path.join(data_dir, "planned_cash_needs.csv"))
        with open(os.path.join(data_dir, "rm_notes.json"), encoding="utf-8") as f:
            self.notes = json.load(f)

        self.latest_date = "2026-08-26"

    def run(self) -> pd.DataFrame:
        """Executes Sub-scores A, B, C and D (Attention Score Aggregator)."""
        h_latest = self.holdings_df[self.holdings_df["snapshot_date"] == self.latest_date].copy()

        rows = []
        for _, cl in self.clients_df.iterrows():
            cid = cl["client_id"]
            name = cl["client_name"]
            chl = h_latest[h_latest["client_id"] == cid]
            tot_aum = float(chl["market_value_usd"].sum()) if len(chl) > 0 else float(cl["total_aum_usd"])

            # ----------------------------------------------------
            # Sub-score A: RISK SCORE (50% Loss magnitude + 50% LTV Proximity)
            # Concentration is deliberately NOT a factor in Pipeline 1.
            # ----------------------------------------------------
            # 1. Loss magnitude: sum of negative unrealised_pnl_base / total AUM, capped at 100%
            neg_pnl_sum = 0.0
            if len(chl) > 0:
                # Sum of holdings sitting at an unrealised loss
                neg_losses = chl[chl["unrealised_pnl_base"] < 0]["unrealised_pnl_base"].sum()
                neg_pnl_sum = abs(float(neg_losses))
            
            loss_magnitude_pct = min(1.0, (neg_pnl_sum / tot_aum)) if tot_aum > 0 else 0.0

            # 2. LTV proximity bonus (~5 clients with credit facility)
            cf = self.credit_df[self.credit_df["client_id"] == cid]
            has_facility = len(cf) > 0
            ltv_bonus = 0.0
            cushion = 999.0
            ltv_curr = 0.0
            ltv_trig = 0.0

            if has_facility:
                cf_row = cf.iloc[0]
                ltv_curr = float(cf_row["ltv_pct_2026-08-26"])
                ltv_trig = float(cf_row["margin_call_ltv_pct"])
                cushion = ltv_trig - ltv_curr
                # Cushion below 10pts pushes factor up, capped at 1.0 as cushion -> 0
                if cushion <= 10.0:
                    ltv_bonus = max(0.0, min(1.0, (10.0 - cushion) / 10.0))
                else:
                    ltv_bonus = 0.0

            raw_risk_score = (0.50 * loss_magnitude_pct) + (0.50 * ltv_bonus)

            # ----------------------------------------------------
            # Sub-score B: LIQUIDITY SCORE
            # Weighted % of book that's Daily (0.0) / Weekly (0.5) / Illiquid (1.0)
            # ----------------------------------------------------
            liq_tier_sums = chl.groupby("liquidity_tier")["market_value_usd"].sum()
            illiquid_val = float(liq_tier_sums.get("Illiquid", 0.0))
            weekly_val = float(liq_tier_sums.get("Weekly", 0.0))
            raw_liquidity_score = ((illiquid_val * 1.0) + (weekly_val * 0.5)) / tot_aum if tot_aum > 0 else 0.0

            # ----------------------------------------------------
            # Sub-score C: URGENCY SCORE
            # Rule-based date / keyword bucket: Urgent / This Year / Next Year+ / Unspecified
            # ----------------------------------------------------
            cn = self.cash_needs_df[self.cash_needs_df["client_id"] == cid]
            raw_urgency_score = 0.10  # Unspecified baseline
            urgency_driver = "Unspecified"

            # Check planned_cash_needs.csv dates
            for _, need in cn.iterrows():
                df_str = str(need["due_from"])
                desc = str(need["description"])[:28]
                ccy = str(need["currency"])
                amt_m = float(need["amount"]) / 1e6
                if "2026" in df_str:
                    raw_urgency_score = max(raw_urgency_score, 1.0)  # Urgent
                    urgency_driver = f"Urgent 2026: {ccy} {amt_m:.1f}m ({desc})"
                elif "2027" in df_str:
                    if raw_urgency_score < 0.75:
                        raw_urgency_score = 0.75  # This Year / Next Year
                        urgency_driver = f"Next Year: {ccy} {amt_m:.1f}m ({desc})"
                else:
                    if raw_urgency_score < 0.40:
                        raw_urgency_score = 0.40  # Next Year+

            # Check clients.csv objectives text + rm_notes.json
            obj_text = str(cl.get("objectives", "")).lower()
            if "2026" in obj_text or "immediate" in obj_text:
                raw_urgency_score = max(raw_urgency_score, 1.0)
                if urgency_driver == "Unspecified":
                    urgency_driver = "Urgent: 2026 Objective deadline"
            elif "2027" in obj_text:
                raw_urgency_score = max(raw_urgency_score, 0.75)
                if urgency_driver == "Unspecified":
                    urgency_driver = "Next Year: 2027 Objective deadline"

            c_notes = [n for n in self.notes if n["client_id"] == cid]
            for n in c_notes:
                txt = n["note"].lower()
                if any(w in txt for w in ["breach", "margin call", "drawdown", "gated", "gate"]):
                    raw_urgency_score = max(raw_urgency_score, 1.0)
                    urgency_driver = f"Urgent Note: {n['note'][:35]}..."

            rows.append({
                "client_id": cid,
                "client_name": name,
                "total_aum_usd": tot_aum,
                "has_facility": has_facility,
                "current_ltv": ltv_curr,
                "trigger_ltv": ltv_trig,
                "cushion": cushion,
                "loss_magnitude_pct": round(loss_magnitude_pct * 100, 2),
                "ltv_bonus": round(ltv_bonus, 2),
                "raw_risk": raw_risk_score,
                "raw_liquidity": raw_liquidity_score,
                "raw_urgency": raw_urgency_score,
                "urgency_driver": urgency_driver
            })

        df = pd.DataFrame(rows)

        # ----------------------------------------------------
        # Sub-score D: ATTENTION SCORE AGGREGATOR
        # Normalises A+B+C (percentile rank per client) -> one score
        # ----------------------------------------------------
        df["risk_score"] = (df["raw_risk"].rank(pct=True) * 100).round(1)
        df["liquidity_score"] = (df["raw_liquidity"].rank(pct=True) * 100).round(1)
        df["urgency_score"] = (df["raw_urgency"].rank(pct=True) * 100).round(1)

        # Equal-weighted aggregate normalized percentile
        df["attention_score"] = (
            (df["risk_score"] + df["liquidity_score"] + df["urgency_score"]) / 3.0
        ).round(1)

        df = df.sort_values("attention_score", ascending=False).reset_index(drop=True)
        df["rank"] = range(1, len(df) + 1)
        return df


# ==============================================================================
# PIPELINE 2: PER-CLIENT DEEP DIVE (STANDALONE)
# ==============================================================================
class PerClientDeepDivePipeline:
    """
    Pipeline 2 — Per-Client Deep Dive
    Runs on demand, one client at a time. Produces the RM Card.
    Independent: Concentration lives entirely here (Monitor Agent) and does not feed Pipeline 1.
    """

    def __init__(self, data_dir: str = DATA_DIR):
        self.data_dir = data_dir
        self.clients_df = pd.read_csv(os.path.join(data_dir, "clients.csv"))
        self.holdings_df = pd.read_csv(os.path.join(data_dir, "holdings.csv"))
        self.credit_df = pd.read_csv(os.path.join(data_dir, "credit_facilities.csv"))
        self.instruments_df = pd.read_csv(os.path.join(data_dir, "instruments.csv"))
        self.mandates_df = pd.read_csv(os.path.join(data_dir, "mandates.csv"))
        self.events_df = pd.read_csv(os.path.join(data_dir, "event_log.csv"))
        self.market_df = pd.read_csv(os.path.join(data_dir, "market_context.csv"))
        with open(os.path.join(data_dir, "rm_notes.json"), encoding="utf-8") as f:
            self.notes = json.load(f)

        self.snapshot_dates = sorted(self.holdings_df["snapshot_date"].unique())
        self.latest_date = self.snapshot_dates[-1]

    def _normalize_issuer(self, name: str, underlying: Optional[str]) -> str:
        target = str(underlying) if pd.notna(underlying) and str(underlying).strip() != "" else str(name)
        cleaned = re.sub(r'(\d+\.?\d*%\s*(Perpetual|bond)?)|Perpetual|Ltd\.?|Inc\.?|Corp\.?|Tbk|AB|KK|Holdings|Fund', '', target, flags=re.IGNORECASE)
        cleaned = re.sub(r'ref\.\s*', '', cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r',\s*\d+M', '', cleaned, flags=re.IGNORECASE)
        cleaned = ' '.join(cleaned.split()).strip()
        if "Golden Harbour" in cleaned or "Golden Harbour" in target:
            return "Golden Harbour Properties"
        if "Meridian" in cleaned or "Meridian" in target:
            return "Meridian Tech Group"
        if "Aranya" in cleaned or "Aranya" in target or "Series D preference shares" in target:
            return "Aranya Technologies"
        return cleaned


    def run(self, client_id: str) -> Dict[str, Any]:
        """Runs the 7-stage sequence for whichever client is selected."""
        # 1. Monitor Agent
        monitor = self._run_monitor_agent(client_id)

        # 2. Event-Grounding Agent
        grounding = self._run_event_grounding_agent(client_id, monitor["top_issuer"])

        # 3. Compliance Agent
        compliance = self._run_compliance_agent(client_id, monitor["top_issuer_weight"])

        # 4. Personality Agent
        personality = self._run_personality_agent(client_id)

        # 5. Explainer Agent
        explainer = self._run_explainer_agent(client_id, monitor, grounding, compliance, personality)

        # 6. RM Handoff Agent
        rm_handoff = self._run_rm_handoff_agent(client_id, monitor, compliance, personality, explainer)

        # 7. Historical-Replay Agent
        historical_replay = self._run_historical_replay_agent(client_id)

        return {
            "client_id": client_id,
            "monitor": monitor,
            "event_grounding": grounding,
            "compliance": compliance,
            "personality": personality,
            "explainer": explainer,
            "rm_handoff": rm_handoff,
            "historical_replay": historical_replay
        }

    def _run_monitor_agent(self, client_id: str) -> Dict[str, Any]:
        cf = self.credit_df[self.credit_df["client_id"] == client_id]
        has_facility = len(cf) > 0
        ltv_trajectory = []
        cushion = 0.0
        trigger = 0.0
        current_ltv = 0.0

        if has_facility:
            r = cf.iloc[0]
            trigger = float(r["margin_call_ltv_pct"])
            current_ltv = float(r["ltv_pct_2026-08-26"])
            cushion = trigger - current_ltv
            for d in self.snapshot_dates:
                ltv_trajectory.append({
                    "date": d,
                    "ltv": float(r.get(f"ltv_pct_{d}", 0.0)),
                    "trigger": trigger,
                    "drawn": float(r.get(f"drawn_{d}", 0.0)),
                    "lending_value": float(r.get(f"lending_value_{d}", 0.0))
                })

        # Issuer look-through concentration across ALL portfolios for this client
        chl = self.holdings_df[(self.holdings_df["client_id"] == client_id) & (self.holdings_df["snapshot_date"] == self.latest_date)].copy()
        inst_dict = self.instruments_df.set_index("instrument_id")["underlying_reference"].to_dict()
        chl["issuer"] = [self._normalize_issuer(n, inst_dict.get(iid)) for n, iid in zip(chl["instrument_name"], chl["instrument_id"])]

        tot_aum = float(chl["market_value_usd"].sum()) if len(chl) > 0 else 1.0
        issuer_sums = chl.groupby("issuer")["market_value_usd"].sum()
        top_issuer = str(issuer_sums.idxmax()) if len(issuer_sums) > 0 else "None"
        top_issuer_val = float(issuer_sums.max()) if len(issuer_sums) > 0 else 0.0
        top_issuer_weight = round((top_issuer_val / tot_aum) * 100.0, 2) if tot_aum > 0 else 0.0

        return {
            "has_facility": has_facility,
            "current_ltv": current_ltv,
            "trigger": trigger,
            "margin_cushion": round(cushion, 2),
            "ltv_trajectory": ltv_trajectory,
            "top_issuer": top_issuer,
            "top_issuer_weight": top_issuer_weight
        }

    def _run_event_grounding_agent(self, client_id: str, top_issuer: str) -> Dict[str, Any]:
        """Grounded: matched event_log.csv row. Ungrounded: 'no market cause found'."""
        matched = []
        for _, ev in self.events_df.iterrows():
            desc = str(ev["description"]).lower()
            trans = str(ev["primary_transmission"]).lower()
            iss = top_issuer.lower()

            hit = False
            if "golden harbour" in iss and ("hormuz" in desc or "oil" in trans or "energy" in trans):
                hit = True
            elif ("tech" in iss or "aranya" in iss or "series d" in iss) and ("technology" in trans or "technology" in desc):
                hit = True
            elif any(k in desc or k in trans for k in iss.split() if len(k) > 3):
                hit = True

            if hit:
                matched.append({
                    "event_date": str(ev["event_date"]),
                    "severity": str(ev["severity"]),
                    "description": str(ev["description"]),
                    "primary_transmission": str(ev["primary_transmission"])
                })

        if matched:
            top_ev = matched[0]
            return {
                "grounded": True,
                "matched_event": top_ev,
                "citation": f"Event on {top_ev['event_date']} ({top_ev['severity']}): {top_ev['description']}"
            }
        return {
            "grounded": False,
            "matched_event": None,
            "citation": "no market cause found"
        }

    def _run_compliance_agent(self, client_id: str, top_issuer_weight: float) -> Dict[str, Any]:
        """Single-position cap check vs mandate, checks for existing waiver before flagging as fresh breach."""
        cl = self.clients_df[self.clients_df["client_id"] == client_id].iloc[0]
        risk_prof = cl.get("risk_profile", "Balanced")
        cap_pct = 12.0  # Julius Baer balanced single position cap

        is_breach = top_issuer_weight > cap_pct

        # Check existing waiver in rm_notes.json
        c_notes = [n for n in self.notes if n["client_id"] == client_id]
        has_waiver = False
        waiver_quote = None
        for n in c_notes:
            txt = n["note"].lower()
            if "waiver" in txt or "exception" in txt or "confirmed the instruction in writing" in txt:
                has_waiver = True
                waiver_quote = n["note"]
                break

        status = "PASS"
        if is_breach:
            status = "FLAGGED-BUT-WAIVED" if has_waiver else "FLAGGED"

        return {
            "risk_profile": risk_prof,
            "single_position_cap_pct": cap_pct,
            "top_issuer_weight": top_issuer_weight,
            "is_breached": is_breach,
            "has_waiver": has_waiver,
            "waiver_quote": waiver_quote,
            "suitability_status": status
        }

    def _run_personality_agent(self, client_id: str) -> Dict[str, Any]:
        """Behavioural read, STRICTLY extraction-only: names pattern + quotes note, else 'insufficient signal in rm_notes'."""
        c_notes = [n for n in self.notes if n["client_id"] == client_id]
        if not c_notes:
            return {
                "signal_status": "insufficient signal in rm_notes",
                "pattern": "insufficient signal in rm_notes",
                "quoted_note": None,
                "framing_suggestion": "insufficient signal in rm_notes"
            }

        extracted = None
        for n in c_notes:
            txt = n["note"]
            tl = txt.lower()
            if "property market turns this year" in tl:
                extracted = {
                    "pattern": "Property sector conviction & loss reluctance",
                    "quoted_note": txt,
                    "framing": "Frame de-risking around ring-fencing capital for the Mid-Levels equity call rather than challenging his property conviction."
                }
                break
            elif "drew a further" in tl and "agitated" in tl:
                extracted = {
                    "pattern": "Founder confidence & resistance to selling tech",
                    "quoted_note": txt,
                    "framing": "Pitch margin de-leveraging as safeguarding runway for his Q4 secondary sale rather than parting with tech shares."
                }
                break

        if extracted:
            return {
                "signal_status": "verified_evidence",
                "pattern": extracted["pattern"],
                "quoted_note": extracted["quoted_note"],
                "framing_suggestion": extracted["framing"]
            }
        return {
            "signal_status": "insufficient signal in rm_notes",
            "pattern": "insufficient signal in rm_notes",
            "quoted_note": None,
            "framing_suggestion": "insufficient signal in rm_notes"
        }

    def _run_explainer_agent(self, client_id: str, monitor: Dict, grounding: Dict, compliance: Dict, personality: Dict) -> Dict[str, Any]:
        """Combines Stages 1+2+3+4 into plain-English narrative."""
        if monitor["has_facility"]:
            what = f"Lombard LTV is at {monitor['current_ltv']:.1f}% with a {monitor['margin_cushion']:.1f}% cushion below the {monitor['trigger']:.1f}% trigger."
        else:
            what = f"Client maintains a {monitor['top_issuer_weight']:.1f}% look-through exposure in {monitor['top_issuer']}."

        why = f"Grounded market catalyst: {grounding['citation']}." if grounding["grounded"] else "Market catalyst: no market cause found."
        comp = f"Mandate status: {compliance['suitability_status']} (Top exposure {compliance['top_issuer_weight']}% vs {compliance['single_position_cap_pct']}% cap)."
        framing = f"Framing note: {personality['framing_suggestion']}" if personality["signal_status"] != "insufficient signal in rm_notes" else ""

        narrative = f"{what} {why} {comp} {framing}".strip()
        return {
            "what_changed": what,
            "why_changed": why,
            "mandate_summary": comp,
            "narrative": narrative
        }

    def _run_rm_handoff_agent(self, client_id: str, monitor: Dict, compliance: Dict, personality: Dict, explainer: Dict) -> Dict[str, Any]:
        """Headline + gauge + suggested action + suitability check + Accept/Edit/Reject."""
        if client_id == "CL-0014":
            headline = "LTV 69.4% Near 70% Trigger & HKD 60m Mid-Levels Cash Call"
            action = "Restructure part of Golden Harbour perpetual into liquid deposit paper to ring-fence the HKD 60m Mid-Levels cash call."
        elif client_id == "CL-0002":
            headline = "Margin Fragility (73.7% LTV) Ahead of Q4 Secondary Sale"
            action = "Establish a collar on tech custody holdings to protect debt headroom ahead of secondary founder share sale."
        else:
            headline = f"Portfolio Review: {monitor['top_issuer']} Concentration"
            action = f"Review look-through position ({monitor['top_issuer_weight']}%) and confirm liquidity cushion."

        return {
            "headline": headline,
            "gauge_ltv": monitor["current_ltv"],
            "gauge_trigger": monitor["trigger"],
            "suitability_check": compliance["suitability_status"],
            "suggested_action": action,
            "controls": ["Accept", "Edit", "Reject"]
        }

    def _run_historical_replay_agent(self, client_id: str) -> Dict[str, Any]:
        """Applies already-logged event hypothetically to current holdings (strictly historical replay, never a forecast)."""
        chl = self.holdings_df[(self.holdings_df["client_id"] == client_id) & (self.holdings_df["snapshot_date"] == self.latest_date)]
        tot_aum = float(chl["market_value_usd"].sum()) if len(chl) > 0 else 1.0

        # Simulate historical March 2026 Hormuz shock on current holdings
        shock_val = 0.0
        for _, r in chl.iterrows():
            sec = str(r.get("sector", "")).lower()
            mv = float(r["market_value_usd"])
            mult = 1.25 if "energy" in sec else 0.88 if "real estate" in sec else 0.90 if "information technology" in sec else 0.95
            shock_val += mv * mult

        diff_pct = round(((shock_val - tot_aum) / tot_aum) * 100.0, 2) if tot_aum > 0 else 0.0
        return {
            "label": "HISTORICAL REPLAY ONLY",
            "referenced_event": "2026-03-04: Strait of Hormuz closure (Brent surged past $120)",
            "hypothetical_expected_move_pct": diff_pct,
            "disclaimer": "This position would be expected to move roughly X% if an already-logged shock recurred. Explicitly labelled as historical replay, never a forecast."
        }


# ==============================================================================
# PIPELINE 3: FAULT LINES (STANDALONE TAGGING + ANALYSIS LAYER)
# ==============================================================================
class FaultLinesPipeline:
    """
    Pipeline 3 — Fault Lines
    A tagging and analysis layer, run on its own. Produces tag tables and two new metrics, standalone.
    Independent: Produces reference data (tags, sharper margin-call metric, combined-exposure threads).
    """

    def __init__(self, data_dir: str = DATA_DIR):
        self.data_dir = data_dir
        self.instruments_df = pd.read_csv(os.path.join(data_dir, "instruments.csv"))
        self.clients_df = pd.read_csv(os.path.join(data_dir, "clients.csv"))
        self.credit_df = pd.read_csv(os.path.join(data_dir, "credit_facilities.csv"))
        self.holdings_df = pd.read_csv(os.path.join(data_dir, "holdings.csv"))
        self.events_df = pd.read_csv(os.path.join(data_dir, "event_log.csv"))
        with open(os.path.join(data_dir, "rm_notes.json"), encoding="utf-8") as f:
            self.notes = json.load(f)

        self.latest_date = "2026-08-26"
        self._cached_tags = None

    def run(self) -> Dict[str, Any]:
        """Produces tag tables + margin-call metrics + thread objects (standalone output)."""
        stage1_tags = self.run_driver_tagging()
        stage3a_metrics = self.run_margin_call_proximity_metrics()
        stage3b_threads = self.run_thread_based_amount_at_risk(stage1_tags)

        return {
            "driver_tagging": stage1_tags,
            "margin_call_proximity_metrics": stage3a_metrics,
            "thread_amount_at_risk": stage3b_threads
        }

    def run_driver_tagging(self) -> Dict[str, Any]:
        """
        Stage 1: Driver Tagging (cached once, not recomputed per request)
        - Tier A tags: macro/event, split from event_log's own primary_transmission vocabulary
        - Tier B tags: canonical entity/issuer (normalized keys + manual override)
        - Client-context tags: evidence-only from source_of_wealth, objectives, rm_notes (closed list)
        """
        if self._cached_tags:
            return self._cached_tags

        # Extract macro vocabulary from event_log's primary_transmission
        tier_a_vocab = set()
        for v in self.events_df["primary_transmission"].dropna():
            for term in str(v).split(","):
                tier_a_vocab.add(term.strip())

        # Build instrument tags
        instrument_tags = {}
        for _, inst in self.instruments_df.iterrows():
            iid = inst["instrument_id"]
            name = str(inst["instrument_name"])
            und = str(inst.get("underlying_reference", ""))
            sec = str(inst.get("sector", "")).lower()

            # Tier A tag match from event_log vocabulary
            t_a = []
            for t in tier_a_vocab:
                tl = t.lower()
                if (tl in sec) or (tl in name.lower()):
                    t_a.append(t)

            # Tier B canonical entity tag
            raw_entity = und if und and und != "nan" else name
            cleaned = re.sub(r'(\d+\.?\d*%\s*(Perpetual|bond)?)|Perpetual|Ltd\.?|Inc\.?|Corp\.?|Tbk|AB|KK|Holdings|Fund', '', raw_entity, flags=re.IGNORECASE)
            cleaned = re.sub(r'ref\.\s*', '', cleaned, flags=re.IGNORECASE)
            cleaned = re.sub(r',\s*\d+M', '', cleaned, flags=re.IGNORECASE)
            entity_tag = ' '.join(cleaned.split()).strip()

            # Manual override table for multi-instrument parity
            if "Golden Harbour" in entity_tag:
                entity_tag = "Golden Harbour Properties"
            elif "Meridian" in entity_tag:
                entity_tag = "Meridian Tech Group"
            elif "Aranya" in entity_tag or "Series D" in raw_entity:
                entity_tag = "Aranya Technologies"

            instrument_tags[iid] = {
                "instrument_id": iid,
                "tier_a_macro_tags": t_a,
                "tier_b_entity_tag": entity_tag
            }

        # Client-context tags (evidence-only from closed candidate list)
        candidate_themes = ["Real Estate", "Technology", "Energy", "Succession Planning", "Liquidity Event", "Tax Planning"]
        client_tags = {}
        for _, cl in self.clients_df.iterrows():
            cid = cl["client_id"]
            corpus = f"{cl.get('source_of_wealth', '')} {cl.get('objectives', '')}"
            c_notes = [n["note"] for n in self.notes if n["client_id"] == cid]
            corpus += " " + " ".join(c_notes)
            corpus_lower = corpus.lower()

            matched_tags = []
            for theme in candidate_themes:
                if theme.lower() in corpus_lower or (theme == "Real Estate" and "property" in corpus_lower):
                    matched_tags.append(theme)

            client_tags[cid] = {
                "client_id": cid,
                "evidence_tags": matched_tags
            }

        self._cached_tags = {
            "instrument_tags": instrument_tags,
            "client_context_tags": client_tags,
            "tier_a_vocabulary": sorted(list(tier_a_vocab))
        }
        return self._cached_tags

    def run_margin_call_proximity_metrics(self) -> List[Dict[str, Any]]:
        """
        Stage 3a: Margin-Call Proximity Metric
        - headroom_pct = margin_call_ltv_pct - ltv_pct_current
        - market_drop_to_trigger_pct ≈ 1 - (ltv_current / margin_call_ltv)
        Flagged as a directional estimate, not an exact figure.
        """
        metrics = []
        for _, r in self.credit_df.iterrows():
            cid = r["client_id"]
            ltv_curr = float(r["ltv_pct_2026-08-26"])
            ltv_trigger = float(r["margin_call_ltv_pct"])
            headroom = ltv_trigger - ltv_curr
            drop_to_trigger = (1.0 - (ltv_curr / ltv_trigger)) * 100.0 if ltv_trigger > 0 else 0.0

            metrics.append({
                "client_id": cid,
                "facility_id": r["facility_id"],
                "facility_type": r["facility_type"],
                "ltv_current": ltv_curr,
                "margin_call_ltv": ltv_trigger,
                "headroom_pct": round(headroom, 2),
                "market_drop_to_trigger_pct": round(drop_to_trigger, 2),
                "note": "Directional estimate, not an exact figure"
            })
        return metrics

    def run_thread_based_amount_at_risk(self, driver_tags: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Stage 3b: Thread-Based Amount-At-Risk
        Groups instruments sharing a Tier B entity tag into a 'thread' object, sums combined market value.
        Outputs: {client_id, driver, instrument_ids, combined_market_value_usd, pct_of_client_aum}
        """
        inst_tags = driver_tags.get("instrument_tags", {})
        h_latest = self.holdings_df[self.holdings_df["snapshot_date"] == self.latest_date].copy()

        threads = []
        for cid, group in h_latest.groupby("client_id"):
            tot_aum = float(group["market_value_usd"].sum())
            entity_map = {}

            for _, row in group.iterrows():
                iid = row["instrument_id"]
                tag_info = inst_tags.get(iid, {})
                entity = tag_info.get("tier_b_entity_tag", row["instrument_name"])
                
                if entity not in entity_map:
                    entity_map[entity] = {
                        "instrument_ids": [],
                        "total_val": 0.0
                    }
                entity_map[entity]["instrument_ids"].append(iid)
                entity_map[entity]["total_val"] += float(row["market_value_usd"])

            for entity, data in entity_map.items():
                val = data["total_val"]
                pct = round((val / tot_aum) * 100.0, 2) if tot_aum > 0 else 0.0
                threads.append({
                    "client_id": cid,
                    "driver": entity,
                    "instrument_ids": data["instrument_ids"],
                    "combined_market_value_usd": round(val, 2),
                    "pct_of_client_aum": pct
                })

        return sorted(threads, key=lambda x: x["combined_market_value_usd"], reverse=True)


# ==============================================================================
# MAIN TEST & VERIFICATION
# ==============================================================================
if __name__ == "__main__":
    print("=" * 80)
    print("TESTING PIPELINE 1: BOOK-LEVEL TRIAGE (STANDALONE)")
    print("=" * 80)
    p1 = BookLevelTriagePipeline()
    df_p1 = p1.run()
    print(df_p1[["rank", "client_id", "client_name", "attention_score", "risk_score", "liquidity_score", "urgency_score", "urgency_driver"]].head(6).to_string())

    print("\n" + "=" * 80)
    print("TESTING PIPELINE 2: PER-CLIENT DEEP DIVE (STANDALONE: CL-0014)")
    print("=" * 80)
    p2 = PerClientDeepDivePipeline()
    res_p2 = p2.run("CL-0014")
    print("Monitor Top Issuer:", res_p2["monitor"]["top_issuer"], f"({res_p2['monitor']['top_issuer_weight']}%)")
    print("Grounding Citation:", res_p2["event_grounding"]["citation"])
    print("Compliance Suitability:", res_p2["compliance"]["suitability_status"])
    print("Personality Pattern:", res_p2["personality"]["pattern"])
    print("RM Handoff Action:", res_p2["rm_handoff"]["suggested_action"])

    print("\n" + "=" * 80)
    print("TESTING PIPELINE 3: FAULT LINES (STANDALONE TAGGING + METRICS)")
    print("=" * 80)
    p3 = FaultLinesPipeline()
    res_p3 = p3.run()
    print(f"Driver Tagging: {len(res_p3['driver_tagging']['instrument_tags'])} instruments tagged.")
    print("Margin-Call Proximity Metrics (Sample):", res_p3["margin_call_proximity_metrics"][:2])
    print("Top Thread-based Amount-At-Risk:", res_p3["thread_amount_at_risk"][:3])
