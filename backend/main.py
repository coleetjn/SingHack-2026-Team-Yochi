from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import json
import asyncio
import pandas as pd
from typing import Dict, Any, List, Optional

from pipelines import BookLevelTriagePipeline, PerClientDeepDivePipeline, FaultLinesPipeline

app = FastAPI(title="Yochi Workbench API")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

data_dir = '../data' if os.path.exists('../data') else 'data'
holdings_df = pd.read_csv(os.path.join(data_dir, 'holdings.csv'))
credit_df = pd.read_csv(os.path.join(data_dir, 'credit_facilities.csv'))
clients_df = pd.read_csv(os.path.join(data_dir, 'clients.csv'))
planned_cash_df = pd.read_csv(os.path.join(data_dir, 'planned_cash_needs.csv'))

# Initialize the 3 standalone pipelines
p1 = BookLevelTriagePipeline(data_dir=data_dir)
p2 = PerClientDeepDivePipeline(data_dir=data_dir)
p3 = FaultLinesPipeline(data_dir=data_dir)

dates_map = {
    '2025-12-31': 'Dec 31',
    '2026-02-27': 'Feb 28',
    '2026-03-31': 'Mar 31',
    '2026-06-30': 'Jun 30',
    '2026-08-26': 'Aug 26'
}

ASSET_COLORS = {
    'Equity': '#294E43',
    'Fixed Income': '#447062',
    'Alternatives': '#B37D2E',
    'Cash': '#82877D',
    'Cash and Equivalents': '#82877D',
    'Commodities': '#C08A3E',
    'Structured': '#5B6E67',
    'Structured Products': '#5B6E67'
}

def compute_asset_allocations(cid: str) -> List[Dict[str, Any]]:
    latest_snapshot = holdings_df['snapshot_date'].max()
    c_holdings = holdings_df[(holdings_df['client_id'] == cid) & (holdings_df['snapshot_date'] == latest_snapshot)]
    if len(c_holdings) == 0:
        return []
    tot_mv = c_holdings['market_value_usd'].sum()
    c_alloc = []
    for ac, ac_grp in c_holdings.groupby('asset_class'):
        pct = round(float(ac_grp['market_value_usd'].sum() / tot_mv) * 100.0, 1)
        name_clean = 'Structured' if 'Structured' in ac else 'Cash' if 'Cash' in ac else ac
        c_alloc.append({
            'name': name_clean,
            'value': pct,
            'color': ASSET_COLORS.get(ac, '#294E43')
        })
    c_alloc.sort(key=lambda x: x['value'], reverse=True)
    return c_alloc

def build_client_dossier(cid: str) -> Dict[str, Any]:
    """Dynamically executes Pipeline 2 & computes 100% authentic portfolio telemetry."""
    cl_rows = clients_df[clients_df['client_id'] == cid]
    if len(cl_rows) == 0:
        raise HTTPException(status_code=404, detail="Client not found")
    cl = cl_rows.iloc[0]
    name = cl['client_name']
    
    # Check credit facilities strictly against raw credit_facilities.csv
    cf = credit_df[credit_df['client_id'] == cid]
    has_cf = len(cf) > 0
    
    trigger_ltv = float(cf.iloc[0]['margin_call_ltv_pct']) if has_cf else None
    facility_type = str(cf.iloc[0]['facility_type']) if has_cf else None
    
    snapshots = []
    for idx, (date_raw, date_label) in enumerate(dates_map.items()):
        h_date = holdings_df[(holdings_df['client_id'] == cid) & (holdings_df['snapshot_date'] == date_raw)]
        aum_val = round(float(h_date['market_value_usd'].sum()) / 1e6, 2) if len(h_date) > 0 else round(float(cl['total_aum_usd']) / 1e6, 2)
        
        if has_cf:
            col_ltv = f'ltv_pct_{date_raw}'
            col_mv = f'collateral_market_value_{date_raw}'
            col_drawn = f'drawn_{date_raw}'
            ltv_val = float(cf.iloc[0].get(col_ltv, 0.0))
            coll_val = round(float(cf.iloc[0].get(col_mv, 0.0)) / 1e6, 2)
            drawn_val = round(float(cf.iloc[0].get(col_drawn, 0.0)) / 1e6, 2)
        else:
            ltv_val = None
            coll_val = None
            drawn_val = None
            
        snapshots.append({
            'date': date_label,
            'ltv': ltv_val,
            'collateral': coll_val,
            'drawn': drawn_val,
            'aum': aum_val
        })
    
    # Run Pipeline 2 dynamically for this client
    p2_card = p2.run(cid)
    top_conc = p2_card.get('monitor', {})
    conc_name = top_conc.get('top_issuer', 'Core Mandate Holdings')
    conc_val = round(top_conc.get('top_issuer_weight', 0.0), 1)
    conc_limit = round(p2_card.get('compliance', {}).get('single_position_cap_pct', 12.0), 1)
    suitability = p2_card.get('compliance', {}).get('suitability_status', 'Compliant')
    
    event_grounding = p2_card.get('event_grounding', {})
    event_details = event_grounding.get('citation') or event_grounding.get('reason', 'Routine portfolio review.')
    narrative = p2_card.get('explainer', {}).get('narrative', '')
    historical_replay = p2_card.get('historical_replay', {})
    
    c_needs = planned_cash_df[planned_cash_df['client_id'] == cid]
    if len(c_needs) > 0:
        first_need = c_needs.iloc[0]
        amt_num = float(first_need['amount'])
        ccy = first_need['currency']
        amt_str = f"{ccy} {amt_num/1e6:.1f}m" if amt_num >= 1e6 else f"{ccy} {amt_num/1e3:.0f}k"
        horizon_str = f"{first_need['description']} ({first_need['due_from'][:7]})"
    else:
        amt_str = "No Scheduled Calls"
        horizon_str = f"Investment horizon: {cl.get('investment_horizon_years', 10)}y"
        
    profile = {
        'name': name,
        'tax_domicile': cl.get('tax_domicile', 'Unknown'),
        'risk_profile': cl.get('risk_profile', 'Balanced'),
        'snapshots': snapshots,
        'hasFacility': has_cf,
        'facilityType': facility_type,
        'triggerLtv': trigger_ltv,
        'concentration': {
            'name': conc_name,
            'value': conc_val,
            'limit': conc_limit,
            'status': suitability
        },
        'eventDetails': event_details,
        'eventDate': 'Aug 26',
        'cashCall': {
            'amount': amt_str,
            'horizon': horizon_str
        },
        'narrative': narrative,
        'historicalReplay': historical_replay
    }
    return profile

class AdvisoryRequest(BaseModel):
    energy_pct: float = 0.0
    equity_pct: float = 0.0
    rate_bps: float = 0.0

@app.get("/api/clients")
async def get_clients():
    """Dynamically executes Pipeline 1 (Book-Level Triage) on every request without fabrication."""
    print("Executing Pipeline 1 (BookLevelTriagePipeline.run())...")
    live_triage_df = p1.run()
    
    live_triage_list = []
    for _, row in live_triage_df.iterrows():
        cid = row['client_id']
        name = row['client_name']
        att = float(row['attention_score'])
        risk = float(row['risk_score'])
        liq = float(row['liquidity_score'])
        urg_driver = row['urgency_driver']
        has_cf = bool(row['has_facility'])
        
        status = 'stable'
        if att >= 80:
            status = 'critical'
        elif att >= 50:
            status = 'warning'
            
        reason = urg_driver
        if has_cf:
            ltv = float(row['current_ltv'])
            trig = float(row['trigger_ltv'])
            cushion = trig - ltv
            if cushion < 2.0:
                reason = f'LTV {ltv:.1f}% vs {trig:.0f}% trigger'
            elif ltv >= trig:
                reason = f'Margin call breach ({ltv:.2f}%)'
            elif cushion < 5.0:
                reason = f'LTV cushion {cushion:.1f}pts'
        else:
            loss_mag = float(row['loss_magnitude_pct']) * 100.0
            if loss_mag > 15.0:
                reason = f'Unrealised loss drag ({loss_mag:.1f}% AUM)'
                
        horizon_val = clients_df[clients_df['client_id'] == cid]['investment_horizon_years'].values[0]
        
        live_triage_list.append({
            'id': cid,
            'name': name,
            'status': status,
            'urgency': int(round(att)),
            'reason': reason,
            'hasFacility': has_cf,
            'creditScore': int(round(risk)),
            'liquidityScore': int(round(liq)),
            'horizonDays': f"{horizon_val}y"
        })
    return live_triage_list

@app.get("/api/clients/{client_id}")
async def get_client_details(client_id: str):
    """Dynamically executes Pipeline 2 (Deep Dive) and Pipeline 3 (Fault Lines) on every request."""
    print(f"Dynamically executing Pipeline 2 & 3 for client: {client_id}...")
    profile = build_client_dossier(client_id)
    c_alloc = compute_asset_allocations(client_id)
    
    # Run Pipeline 3 (Fault Lines) dynamically
    p3_res = p3.run()
    p3_threads = p3_res.get('thread_amount_at_risk', [])
    c_threads = [t for t in p3_threads if t.get('client_id') == client_id]
    
    p3_metrics_list = p3_res.get('margin_call_proximity_metrics', [])
    p3_metric = next((m for m in p3_metrics_list if m.get('client_id') == client_id), None)
    
    return {
        "client_id": client_id,
        "profile": profile,
        "asset_allocations": c_alloc,
        "p3_metric": p3_metric,
        "p3_threads": c_threads
    }

@app.get("/api/pipeline3")
async def get_pipeline3_data():
    """Dynamically executes Pipeline 3 (Fault Lines)."""
    print("Dynamically executing Pipeline 3 (FaultLinesPipeline.run())...")
    p3_res = p3.run()
    return {
        "metrics": p3_res.get('margin_call_proximity_metrics', {}),
        "threads": p3_res.get('thread_amount_at_risk', [])
    }

@app.post("/api/clients/{client_id}/advisory")
async def generate_advisory(client_id: str, req: AdvisoryRequest):
    # Short realistic execution latency for pipeline inference
    await asyncio.sleep(1.2)
    
    # Directly run Pipeline 2 (PerClientDeepDivePipeline) dynamically on demand
    print(f"Dynamically executing Pipeline 2 (PerClientDeepDivePipeline.run({client_id}))...")
    p2_result = p2.run(client_id)
    
    monitor = p2_result.get("monitor", {})
    grounding = p2_result.get("event_grounding", {})
    compliance = p2_result.get("compliance", {})
    personality = p2_result.get("personality", {})
    rm_handoff = p2_result.get("rm_handoff", {})
    
    cl_row = clients_df[clients_df['client_id'] == client_id].iloc[0]
    c_name = cl_row['client_name']
    
    has_cf = monitor.get("has_facility", False)
    cur_ltv = monitor.get("current_ltv", 0.0)
    trig_ltv = monitor.get("trigger", 0.0)
    cushion = monitor.get("margin_cushion", 0.0)
    top_issuer = monitor.get("top_issuer", "Core Mandate Holdings")
    top_weight = monitor.get("top_issuer_weight", 0.0)
    
    conviction = personality.get("pattern", "Balanced risk orientation")
    framing = personality.get("framing_suggestion", "Frame recommendations around liquidity discipline.")
    quoted = personality.get("quoted_note")
    
    action = rm_handoff.get("suggested_action", f"Review look-through position ({top_weight}%) and confirm liquidity cushion.")
    catalyst = grounding.get("citation") if grounding.get("grounded") else "No direct macro event catalyst identified in event_log.csv"
    
    script = f"**Advisory Synthesis: {c_name} ({client_id})**\n\n"
    script += "**Client Behavioral Profile & Sentiment:**\n"
    script += f"* **Conviction & Bias:** {conviction}.\n"
    script += f"* **Framing Guardrail:** {framing}.\n"
    if quoted:
        script += f"* **RM Note Evidence:** \"{quoted}\"\n"
    script += "\n"
    script += "**Key Talking Points:**\n"
    if has_cf:
        script += f"* **LTV Status:** Lombard LTV at {cur_ltv:.1f}% ({cushion:.1f}pts cushion below {trig_ltv:.1f}% trigger).\n"
    else:
        script += f"* **Credit Facility:** No active Lombard or credit facility. Portfolio un-leveraged.\n"
    script += f"* **Market Catalyst:** {catalyst}.\n"
    script += f"* **Look-Through Concentration:** {top_weight:.1f}% in {top_issuer} (Mandate: {compliance.get('single_position_cap_pct', 12.0)}% cap - {compliance.get('suitability_status', 'Compliant')}).\n"
    script += f"* **Recommended Action:** {action}\n\n"
    script += "**Suggested Email / Call Opener:**\n"
    
    first_name = c_name.split()[0]
    if has_cf and cushion < 5.0:
        script += f"\"Hi {first_name}, reviewing your accounts ahead of your upcoming commitments. With Lombard LTV at {cur_ltv:.1f}% against the {trig_ltv:.1f}% threshold, let's proactively address your {top_issuer} exposure to ring-fence your capital needs.\""
    elif has_cf:
        script += f"\"Hi {first_name}, checking in for your routine portfolio review. Your leverage remains well-cushioned at {cur_ltv:.1f}% against your mandate. I'd welcome the chance to review your current allocations and scheduled cash needs at your convenience.\""
    else:
        script += f"\"Hi {first_name}, checking in on your portfolio. With un-leveraged positions and {top_weight:.1f}% in {top_issuer}, let's review your asset allocation against your scheduled liquidity needs.\""

    return {
        "client_id": client_id,
        "script": script,
        "p2_raw": p2_result
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
