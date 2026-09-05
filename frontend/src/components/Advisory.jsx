import React, { useState } from 'react';
import { Loader2, Copy, Check, Sparkles, X, AlertCircle } from 'lucide-react';

export default function Advisory({ selectedClientId, isOpen, onClose }) {
  const [isDrafting, setIsDrafting] = useState(false);
  const [draft, setDraft] = useState('');
  const [copied, setCopied] = useState(false);

  // 5-Stage Agentic Pipeline architecture (1 second per stage = ~5 seconds total)
  const [loadingStep, setLoadingStep] = useState(0);

  const PIPELINE_STAGES = [
    {
      agent: 'Agent 1: Forensic Structuring',
      badge: 'Deterministic Math',
      badgeColor: 'bg-[#EDEAE2] text-[#252822]',
      action: 'Auditing LTV ratio & collateral valuation across portfolios',
      sources: 'credit_facilities.csv, holdings.csv, portfolios.csv'
    },
    {
      agent: 'Agent 2: Look-Through Decomposition',
      badge: 'Wrapper Unbundling',
      badgeColor: 'bg-[#EDEAE2] text-[#252822]',
      action: 'Decomposing funds, PE & structured notes for hidden single-name concentration',
      sources: 'instruments.csv, mandates.csv'
    },
    {
      agent: 'Agent 3: Causal Attribution',
      badge: 'Deterministic Rules',
      badgeColor: 'bg-[#F5EBD4] text-[#89600C]',
      action: 'Matching timeline movements against external macro shocks (Hormuz/OPEC)',
      sources: 'event_log.csv, market_context.csv'
    },
    {
      agent: 'Agent 4: Behavioral Reconciler',
      badge: 'Heuristic Audit',
      badgeColor: 'bg-[#F8EAE5] text-[#B93832]',
      action: 'Detecting trade divergences vs documented RM risk advisory notes',
      sources: 'rm_notes.json, transactions.csv'
    },
    {
      agent: 'Agent 5: Advisory Synthesis',
      badge: 'Grounded LLM Narrator',
      badgeColor: 'bg-[#12332B] text-[#F5F2EB]',
      action: 'Synthesizing verified telemetric citations into RM talking points & email opener',
      sources: 'Strict Grounded Context (Zero-Hallucination Gate)'
    }
  ];

  React.useEffect(() => {
    let interval;
    if (isDrafting) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev < PIPELINE_STAGES.length - 1 ? prev + 1 : prev));
      }, 950);
    }
    return () => clearInterval(interval);
  }, [isDrafting]);

  // Reset state when client changes
  React.useEffect(() => {
    setDraft('');
    setIsDrafting(false);
    setCopied(false);
  }, [selectedClientId]);

  if (!isOpen) return null;

  const handleDraft = async () => {
    setIsDrafting(true);
    try {
      const response = await fetch(`http://localhost:8000/api/clients/${selectedClientId}/advisory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ energy_pct: 0, equity_pct: 0, rate_bps: 0 })
      });
      if (response.ok) {
        const data = await response.json();
        setDraft(data.script);
      } else {
        setDraft('Failed to generate script. Please verify backend service.');
      }
    } catch (e) {
      setDraft('Failed to connect to backend. Please ensure the FastAPI server is running.');
    } finally {
      setIsDrafting(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-[2px] flex justify-end">
      {/* Slide-over backdrop dismissal overlay */}
      <div 
        className="fixed inset-0 cursor-default" 
        onClick={onClose} 
        aria-hidden="true" 
      />

      <div className="relative w-full sm:w-[460px] lg:w-[480px] bg-[#FBFAF7] h-full shadow-2xl flex flex-col justify-between border-l border-[#DADCD2] z-10">
        
        {/* Drawer Header */}
        <div className="px-6 py-5 border-b border-[#DADCD2] flex items-center justify-between shrink-0 bg-[#F5F2EB]">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif text-xl text-[#252822]">Advisory Synthesis</span>
              <span className="text-[10px] uppercase font-mono tracking-widest px-1.5 py-0.5 bg-[#12332B] text-[#F5F2EB] rounded-[3px]">
                AI
              </span>
            </div>
            <span className="text-xs text-[#666A61] font-mono block mt-1">
              Target Dossier: {selectedClientId}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-[4px] hover:bg-[#EDEAE2] text-[#666A61] hover:text-[#252822] transition-colors cursor-pointer"
            aria-label="Close panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Drawer Content Body */}
        <div className="p-6 flex-1 min-h-0 overflow-y-auto flex flex-col justify-between">
          {!draft && !isDrafting && (
            <div className="space-y-6 py-2">
              <div className="p-4 bg-[#EDEAE2]/70 border border-[#DADCD2] rounded-[6px]">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#252822] uppercase tracking-wider mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#294E43]" />
                  <span>Outreach Briefing Synthesis</span>
                </div>
                <p className="text-xs text-[#666A61] leading-relaxed">
                  Synthesizes verified credit facilities, look-through unbundling, macro timeline attribution, and RM meeting notes into an actionable advisory briefing.
                </p>
              </div>

              <div className="space-y-3">
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[#666A61] block">
                  Grounding Pipeline Telemetry:
                </span>
                <div className="space-y-2 text-xs text-[#252822]">
                  <div className="p-3 bg-white border border-[#DADCD2] rounded-[4px]">
                    <div className="font-semibold text-[#252822] mb-0.5">1. Lombard Facility Audit</div>
                    <div className="text-[#666A61]">Real-time ratio check against 70.0% bank margin trigger.</div>
                  </div>
                  <div className="p-3 bg-white border border-[#DADCD2] rounded-[4px]">
                    <div className="font-semibold text-[#252822] mb-0.5">2. Behavioral Guardrails</div>
                    <div className="text-[#666A61]">Meeting transcripts scanned for biases, risk reluctance & liquidity constraints.</div>
                  </div>
                  <div className="p-3 bg-white border border-[#DADCD2] rounded-[4px]">
                    <div className="font-semibold text-[#252822] mb-0.5">3. Zero-Hallucination Gate</div>
                    <div className="text-[#666A61]">Grounded strictly in verified repository records and timeline citations.</div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleDraft}
                className="w-full mt-4 bg-[#294E43] hover:bg-[#1D4036] text-[#F5F2EB] text-sm font-semibold px-4 py-3 rounded-[6px] transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Generate Client Script</span>
              </button>
            </div>
          )}

          {isDrafting && (
            <div className="flex flex-col h-full justify-between w-full min-h-0 py-2">
              {/* Header Status */}
              <div className="flex items-center justify-between pb-3 border-b border-[#DADCD2] shrink-0">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-[#294E43] animate-spin" />
                  <span className="text-xs font-semibold text-[#252822] uppercase tracking-wider">
                    Pipeline Execution
                  </span>
                </div>
                <span className="text-[11px] font-mono font-medium text-[#294E43] bg-[#EDEAE2] px-2 py-0.5 rounded border border-[#DADCD2]">
                  Stage {loadingStep + 1} of {PIPELINE_STAGES.length}
                </span>
              </div>

              {/* Pipeline Stage Cards */}
              <div className="flex-1 my-3 flex flex-col justify-between gap-2 overflow-y-auto min-h-0">
                {PIPELINE_STAGES.map((stage, idx) => {
                  const isCurrent = idx === loadingStep;
                  const isPassed = idx < loadingStep;
                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-[4px] border transition-all duration-300 shrink-0 ${
                        isCurrent
                          ? 'bg-white border-[#294E43] ring-1 ring-[#294E43]/20 shadow-xs'
                          : isPassed
                          ? 'bg-[#EDEAE2]/50 border-[#DADCD2] text-[#666A61]'
                          : 'bg-white/60 border-[#DADCD2]/50 opacity-40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          {isPassed ? (
                            <div className="w-4 h-4 rounded-full bg-[#294E43] text-[#F5F2EB] flex items-center justify-center text-[10px] font-bold shrink-0">✓</div>
                          ) : isCurrent ? (
                            <div className="w-4 h-4 rounded-full border-2 border-[#294E43] border-t-transparent animate-spin shrink-0" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border border-[#DADCD2] shrink-0" />
                          )}
                          <span className={`text-xs font-semibold truncate ${isCurrent ? 'text-[#252822]' : isPassed ? 'text-[#666A61]' : 'text-[#82877D]'}`}>
                            {stage.agent}
                          </span>
                        </div>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-[3px] shrink-0 ${stage.badgeColor}`}>
                          {stage.badge}
                        </span>
                      </div>

                      <p className={`text-[11px] leading-tight mb-1 pl-6 ${isCurrent ? 'text-[#252822]' : isPassed ? 'text-[#666A61]' : 'text-[#82877D]'}`}>
                        {stage.action}
                      </p>

                      <div className="text-[10px] font-mono text-[#82877D] truncate pl-6">
                        <span className="font-semibold text-[#666A61]">Sources:</span> {stage.sources}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Progress Bar */}
              <div className="w-full bg-[#EDEAE2] rounded-full h-1 overflow-hidden shrink-0">
                <div
                  className="bg-[#294E43] h-1 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${((loadingStep + 1) / PIPELINE_STAGES.length) * 100}%` }}
                />
              </div>
            </div>
          )}

          {draft && !isDrafting && (
            <div className="flex flex-col h-full min-h-0 py-2">
              <div className="flex justify-between items-center mb-3 shrink-0">
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[#666A61]">
                  Generated Briefing
                </span>
                <button 
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-xs font-semibold text-[#252822] bg-white border border-[#DADCD2] hover:bg-[#EDEAE2] transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-[#294E43]" /> : <Copy className="w-3.5 h-3.5 text-[#666A61]" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="flex-1 min-h-0 bg-white rounded-[6px] border border-[#DADCD2] p-4 overflow-y-auto text-sm text-[#252822] leading-relaxed">
                {draft.split('\n\n').map((block, i) => {
                  const lines = block.split('\n');
                  const title = lines[0];

                  if (title.includes('Client Behavioral Profile & Sentiment')) {
                    return (
                      <div key={i} className="mb-4 p-3 bg-[#F5EBD4]/70 border border-[#89600C]/30 rounded-[4px]">
                        <div className="text-xs font-semibold text-[#89600C] uppercase tracking-wider mb-2">
                          Client Behavioral Profile & Sentiment
                        </div>
                        <div className="space-y-1.5 text-xs text-[#252822]">
                          {lines.slice(1).map((l, lIdx) => {
                            const clean = l.replace(/^\*\s*/, '');
                            const parts = clean.split(':**');
                            if (parts.length === 2) {
                              return (
                                <div key={lIdx} className="leading-snug">
                                  <strong className="font-semibold text-[#89600C]">{parts[0].replace(/\*\*/g, '')}:</strong>
                                  <span className="text-[#252822] ml-1">{parts[1]}</span>
                                </div>
                              );
                            }
                            return <div key={lIdx}>{clean}</div>;
                          })}
                        </div>
                      </div>
                    );
                  }

                  if (title.includes('Key Talking Points')) {
                    return (
                      <div key={i} className="mb-4">
                        <h4 className="text-xs font-semibold uppercase tracking-[0.08em] text-[#252822] mb-2">
                          Key Talking Points:
                        </h4>
                        <ul className="space-y-1.5">
                          {lines.slice(1).map((l, lIdx) => (
                            <li key={lIdx} className="text-xs text-[#252822] ml-4 list-disc marker:text-[#294E43] leading-relaxed">
                              {l.replace(/^\*\s*/, '')}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  }

                  if (title.includes('Suggested Email / Call Opener')) {
                    return (
                      <div key={i} className="mb-4 p-3 bg-[#EDEAE2]/60 border border-[#DADCD2] rounded-[4px]">
                        <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[#666A61] mb-1">
                          Suggested Email / Call Opener
                        </div>
                        <div className="text-xs italic text-[#252822] leading-relaxed">
                          {lines.slice(1).join(' ')}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={i} className="mb-3">
                      {lines.map((l, lIdx) => (
                        <p key={lIdx} className="text-xs text-[#252822]">{l.replace(/\*\*/g, '')}</p>
                      ))}
                    </div>
                  );
                })}
              </div>

              <button
                onClick={handleDraft}
                className="mt-4 shrink-0 w-full border border-[#DADCD2] text-[#252822] font-semibold px-4 py-2.5 rounded-[4px] hover:bg-[#EDEAE2] transition-colors text-xs bg-white cursor-pointer"
              >
                Regenerate Analysis
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
