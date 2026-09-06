import pandas as pd
from pipelines import BookLevelTriagePipeline, FaultLinesPipeline, PerClientDeepDivePipeline

print("=== 1. PIPELINE 1 (BOOK-LEVEL TRIAGE) AUDIT ===")
triage = BookLevelTriagePipeline().run()
print(triage[['rank', 'client_id', 'client_name', 'attention_score', 'risk_score', 'liquidity_score', 'urgency_score']].to_string())

print("\n=== 2. PIPELINE 3 (FAULT LINES) PROXIMITY AUDIT ===")
p3 = FaultLinesPipeline().run()
for m in p3['margin_call_proximity_metrics']:
    print(f"{m['client_id']}: Current LTV={m['ltv_current']}%, Trigger={m['margin_call_ltv']}%, Headroom={m['headroom_pct']}pts, Drop to Trigger={m['market_drop_to_trigger_pct']}%")

print("\n=== 3. PIPELINE 3 (FAULT LINES) UNBUNDLED THREADS AUDIT ===")
for t in p3['thread_amount_at_risk'][:5]:
    print(f"{t['client_id']}: Driver={t['driver']}, Instruments={t['instrument_ids']}, Combined Value=${t['combined_market_value_usd']:,.2f}, % of AUM={t['pct_of_client_aum']}%")

print("\n=== 4. PIPELINE 2 (DEEP DIVE MONITOR) LOOK-THROUGH AUDIT ===")
p2 = PerClientDeepDivePipeline()
for cid in ['CL-0014', 'CL-0002']:
    card = p2.run(cid)
    mon = card['monitor']
    print(f"{cid}: Cushion={mon['margin_cushion']}pts, Top Conc={mon['top_issuer']} ({mon['top_issuer_weight']}%)")

