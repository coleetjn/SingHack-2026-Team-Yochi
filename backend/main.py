from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio

app = FastAPI(title="Aegis Workbench API")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AdvisoryRequest(BaseModel):
    # Depending on how the frontend calls it, we might accept shock parameters, etc.
    energy_pct: float = 0.0
    equity_pct: float = 0.0
    rate_bps: float = 0.0

# Mock pre-generated scripts to prevent live LLM latency/failures during demo
CACHED_SCRIPTS = {
    'CL-0014': """**Advisory Synthesis: Lau Chi Ming (CL-0014)**

**Client Behavioral Profile & Sentiment:**
* **Conviction & Bias:** Strong property conviction ("market turns this year"). Resents generic diversification.
* **Framing Guardrail:** Frame de-risking as *ring-fencing cash* for his Mid-Levels project, NOT "property is dropping".

**Key Talking Points:**
* **LTV Alert:** Lombard LTV at 69.4% (near 70% margin trigger).
* **Catalyst:** March Hormuz event forced drawdown for accumulator settlement.
* **Look-Through Concentration:** 29% in Golden Harbour Properties (vs 12% mandate limit).
* **Liquidity Collision:** HKD 60m cash call in mid-2027 with tight liquid cash buffer.

**Suggested Email / Call Opener:**
"Hi Chi Ming, reviewing your Mid-Levels equity requirement for next year. With Lombard LTV at 69.4% against the 70% threshold, let's restructure part of the Golden Harbour exposure now to ring-fence your cash call and protect your development capital."
""",
    'CL-0002': """**Advisory Synthesis: Ravi Chandrasekaran (CL-0002)**

**Client Behavioral Profile & Sentiment:**
* **Conviction & Bias:** Founder pride; agitated during downturns; over-optimistic on tech secondary.
* **Framing Guardrail:** Never demand selling tech. Pitch de-leveraging as *securing runway for his Q4 secondary sale*.

**Key Talking Points:**
* **Breach History:** June LTV breached 75% trigger (75.64%); recovered passively, but debt remains unchanged.
* **Concentration:** 68% in single illiquid custody tech position—zero buffer for volatility.
* **Behavioral Divergence:** Executed leveraged trade on June 8 directly against RM risk advice.

**Suggested Email / Call Opener:**
"Hi Ravi, checking in ahead of your Q4 secondary. Since 68% of wealth sits in custody tech, another volatile swing could force a margin breach right before your liquidity event. Let's map out a protective buffer so your secondary proceeds remain protected."
"""
}

@app.get("/api/clients")
async def get_clients():
    return {"message": "Use frontend mock data for Triage list."}

@app.get("/api/clients/{client_id}")
async def get_client_details(client_id: str):
    return {"message": "Use frontend mock data for Canvas."}

@app.post("/api/clients/{client_id}/advisory")
async def generate_advisory(client_id: str, req: AdvisoryRequest):
    # Simulate realistic 5-second multi-step agent telemetry audit pipeline for demo
    await asyncio.sleep(5.0)
    
    if client_id in CACHED_SCRIPTS:
        script = CACHED_SCRIPTS[client_id]
    else:
        # Procedurally generate a tailored script with behavioral intelligence
        seed = sum(ord(c) for c in client_id)
        baseLtv = 40 + (seed % 30)
        triggerLtv = baseLtv + 15 + (seed % 10)
        isCritical = (triggerLtv - baseLtv) < 10

        script = f"**Advisory Synthesis: Client {client_id}**\n\n"
        script += "**Client Behavioral Profile & Sentiment:**\n"
        script += "* **Conviction & Bias:** Client values autonomy; sensitive to abrupt portfolio repositioning.\n"
        script += "* **Framing Guardrail:** Prioritize collaborative discussion over directive commands.\n\n"
        script += "**Key Talking Points:**\n"
        
        if isCritical:
            script += f"* The client's LTV is at {baseLtv}%, approaching the {triggerLtv}% trigger limit due to recent market volatility.\n"
            script += "* Look-through concentration in diversified assets remains slightly elevated.\n"
            script += "* Recommend an immediate review of liquidity buffers and potential de-leveraging options.\n\n"
            script += "**Suggested Email / Call Opener:**\n"
            script += f"\"Hello. I wanted to flag that your portfolio's leverage has increased recently. We should schedule a brief call this week to review your margin limits and ensure your liquidity buffer remains robust.\""
        else:
            script += f"* The client's portfolio is stable, with LTV comfortably below the {triggerLtv}% trigger.\n"
            script += "* No immediate liquidity concerns or cash calls detected.\n"
            script += "* Portfolio concentration remains within mandate limits.\n\n"
            script += "**Suggested Email / Call Opener:**\n"
            script += f"\"Hello. I'm writing to share your routine portfolio check-up. Your accounts are stable and well within risk mandates. No action is required on your part at this time, but I am available if you'd like to review your current allocations.\""

    return {
        "client_id": client_id,
        "script": script
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
