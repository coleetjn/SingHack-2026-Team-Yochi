import React, { useState, useMemo, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot,
  PieChart as RechartsPieChart,
  Pie,
  Cell
} from 'recharts';
import {
  User,
  DollarSign,
  Shield,
  PieChart,
  Calendar,
  AlertCircle,
  ArrowRight,
  ChevronDown
} from 'lucide-react';
import { realClients } from './Triage';
import pipeline3Data from '../pipeline3_data.json';
import authenticClientDatabase from '../client_database.json';

// Master telemetry database for all 20 real clients
const CLIENT_DATABASE = authenticClientDatabase;

// Verified multi-asset allocations derived directly from holdings.csv
const CLIENT_ASSET_ALLOCATIONS = {
  'CL-0001': [
    { name: 'Equity', value: 70.4, color: '#294E43' },
    { name: 'Fixed Income', value: 14.5, color: '#447062' },
    { name: 'Alternatives', value: 4.2, color: '#B37D2E' },
    { name: 'Cash', value: 3.7, color: '#82877D' },
    { name: 'Commodities', value: 3.7, color: '#C08A3E' },
    { name: 'Structured', value: 3.6, color: '#5B6E67' },
  ],
  'CL-0002': [
    { name: 'Alternatives', value: 68.4, color: '#B37D2E' },
    { name: 'Equity', value: 23.5, color: '#294E43' },
    { name: 'Structured', value: 3.4, color: '#5B6E67' },
    { name: 'Fixed Income', value: 2.6, color: '#447062' },
    { name: 'Cash', value: 2.1, color: '#82877D' },
  ],
  'CL-0003': [
    { name: 'Equity', value: 71.5, color: '#294E43' },
    { name: 'Fixed Income', value: 9.1, color: '#447062' },
    { name: 'Cash', value: 7.7, color: '#82877D' },
    { name: 'Alternatives', value: 6.3, color: '#B37D2E' },
    { name: 'Structured', value: 5.4, color: '#5B6E67' },
  ],
  'CL-0004': [
    { name: 'Fixed Income', value: 64.7, color: '#447062' },
    { name: 'Equity', value: 23.8, color: '#294E43' },
    { name: 'Cash', value: 6.1, color: '#82877D' },
    { name: 'Alternatives', value: 5.4, color: '#B37D2E' },
  ],
  'CL-0005': [
    { name: 'Equity', value: 67.7, color: '#294E43' },
    { name: 'Fixed Income', value: 26.5, color: '#447062' },
    { name: 'Cash', value: 5.7, color: '#82877D' },
  ],
  'CL-0006': [
    { name: 'Equity', value: 40.2, color: '#294E43' },
    { name: 'Fixed Income', value: 29.0, color: '#447062' },
    { name: 'Alternatives', value: 19.3, color: '#B37D2E' },
    { name: 'Cash', value: 11.5, color: '#82877D' },
  ],
  'CL-0007': [
    { name: 'Equity', value: 36.0, color: '#294E43' },
    { name: 'Fixed Income', value: 29.0, color: '#447062' },
    { name: 'Commodities', value: 18.9, color: '#C08A3E' },
    { name: 'Alternatives', value: 7.0, color: '#B37D2E' },
    { name: 'Structured', value: 5.1, color: '#5B6E67' },
    { name: 'Cash', value: 4.0, color: '#82877D' },
  ],
  'CL-0008': [
    { name: 'Equity', value: 49.7, color: '#294E43' },
    { name: 'Fixed Income', value: 32.4, color: '#447062' },
    { name: 'Cash', value: 13.6, color: '#82877D' },
    { name: 'Commodities', value: 4.3, color: '#C08A3E' },
  ],
  'CL-0009': [
    { name: 'Cash', value: 45.0, color: '#82877D' },
    { name: 'Equity', value: 33.4, color: '#294E43' },
    { name: 'Fixed Income', value: 14.5, color: '#447062' },
    { name: 'Alternatives', value: 7.2, color: '#B37D2E' },
  ],
  'CL-0010': [
    { name: 'Equity', value: 49.6, color: '#294E43' },
    { name: 'Fixed Income', value: 36.7, color: '#447062' },
    { name: 'Alternatives', value: 7.3, color: '#B37D2E' },
    { name: 'Cash', value: 6.3, color: '#82877D' },
  ],
  'CL-0011': [
    { name: 'Alternatives', value: 47.3, color: '#B37D2E' },
    { name: 'Fixed Income', value: 24.5, color: '#447062' },
    { name: 'Equity', value: 21.6, color: '#294E43' },
    { name: 'Cash', value: 6.7, color: '#82877D' },
  ],
  'CL-0012': [
    { name: 'Fixed Income', value: 66.6, color: '#447062' },
    { name: 'Equity', value: 22.1, color: '#294E43' },
    { name: 'Cash', value: 7.0, color: '#82877D' },
    { name: 'Alternatives', value: 4.3, color: '#B37D2E' },
  ],
  'CL-0013': [
    { name: 'Equity', value: 75.7, color: '#294E43' },
    { name: 'Structured', value: 7.1, color: '#5B6E67' },
    { name: 'Alternatives', value: 6.5, color: '#B37D2E' },
    { name: 'Fixed Income', value: 5.5, color: '#447062' },
    { name: 'Cash', value: 5.1, color: '#82877D' },
  ],
  'CL-0014': [
    { name: 'Fixed Income', value: 44.2, color: '#447062' },
    { name: 'Equity', value: 23.4, color: '#294E43' },
    { name: 'Alternatives', value: 19.6, color: '#B37D2E' },
    { name: 'Structured', value: 7.0, color: '#5B6E67' },
    { name: 'Cash', value: 5.8, color: '#82877D' },
  ],
  'CL-0015': [
    { name: 'Equity', value: 46.6, color: '#294E43' },
    { name: 'Alternatives', value: 21.9, color: '#B37D2E' },
    { name: 'Structured', value: 12.8, color: '#5B6E67' },
    { name: 'Commodities', value: 7.5, color: '#C08A3E' },
    { name: 'Cash', value: 7.0, color: '#82877D' },
    { name: 'Fixed Income', value: 4.1, color: '#447062' },
  ],
  'CL-0016': [
    { name: 'Equity', value: 67.7, color: '#294E43' },
    { name: 'Fixed Income', value: 21.8, color: '#447062' },
    { name: 'Cash', value: 7.8, color: '#82877D' },
    { name: 'Commodities', value: 2.6, color: '#C08A3E' },
  ],
  'CL-0017': [
    { name: 'Alternatives', value: 37.9, color: '#B37D2E' },
    { name: 'Equity', value: 34.3, color: '#294E43' },
    { name: 'Fixed Income', value: 18.3, color: '#447062' },
    { name: 'Cash', value: 6.1, color: '#82877D' },
    { name: 'Commodities', value: 3.4, color: '#C08A3E' },
  ],
  'CL-0018': [
    { name: 'Equity', value: 50.4, color: '#294E43' },
    { name: 'Fixed Income', value: 23.0, color: '#447062' },
    { name: 'Commodities', value: 14.0, color: '#C08A3E' },
    { name: 'Cash', value: 12.6, color: '#82877D' },
  ],
  'CL-0019': [
    { name: 'Equity', value: 58.0, color: '#294E43' },
    { name: 'Fixed Income', value: 15.7, color: '#447062' },
    { name: 'Structured', value: 12.9, color: '#5B6E67' },
    { name: 'Cash', value: 7.5, color: '#82877D' },
    { name: 'Alternatives', value: 6.0, color: '#B37D2E' },
  ],
  'CL-0020': [
    { name: 'Equity', value: 75.1, color: '#294E43' },
    { name: 'Fixed Income', value: 14.1, color: '#447062' },
    { name: 'Alternatives', value: 6.3, color: '#B37D2E' },
    { name: 'Cash', value: 4.5, color: '#82877D' },
  ]
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#FBFAF7] border border-[#DADCD2] p-2.5 rounded-[4px] shadow-sm text-xs">
        <p className="text-[#666A61] font-semibold mb-1 uppercase tracking-wider text-[10px]">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 font-mono">
            <span className="text-[#252822] font-semibold">{entry.name}:</span>
            <span className="text-[#294E43] font-bold">{entry.value.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function Canvas({ selectedClientId, onOpenAdvisory }) {
  const [oilShock, setOilShock] = useState(0);
  const [liveClientData, setLiveClientData] = useState(null);

  useEffect(() => {
    if (!selectedClientId) return;
    fetch(`http://localhost:8000/api/clients/${selectedClientId}`)
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Failed to fetch client dossier');
      })
      .then(data => {
        setLiveClientData(data);
      })
      .catch(err => {
        console.warn('Backend unavailable, using cached client details:', err);
        setLiveClientData(null);
      });
  }, [selectedClientId]);

  const client = useMemo(() => {
    if (liveClientData?.profile) return liveClientData.profile;
    if (!selectedClientId) return null;
    if (CLIENT_DATABASE[selectedClientId]) return CLIENT_DATABASE[selectedClientId];

    // Look up from realClients list
    const matched = realClients.find(c => c.id === selectedClientId);
    const clientName = matched ? matched.name : `Client ${selectedClientId}`;
    const seed = selectedClientId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const triggerLtv = 65.0 + (seed % 10);
    const baseLtv = triggerLtv - 15 + (seed % 10);
    const dates = ['Jan 31', 'Feb 28', 'Mar 31', 'Apr 30', 'May 31'];
    
    const snapshots = dates.map((date, i) => ({
      date,
      ltv: Number((baseLtv + (i * 1.6)).toFixed(1)),
      collateral: 30.0 - (i * 0.4),
      aum: 25.0 - (i * 0.3),
    }));

    return {
      name: clientName,
      snapshots,
      triggerLtv,
      concentration: { name: 'Core Mandate Holdings', value: 25, limit: 15 },
      eventDetails: matched?.reason || 'Routine portfolio rebalancing review.',
      eventDate: 'Mar 31',
      cashCall: { amount: 'Scheduled Needs', horizon: 'Targeted within 12 months' },
      narrative: `Portfolio LTV is at ${snapshots[snapshots.length - 1].ltv}%, monitored against the ${triggerLtv.toFixed(1)}% threshold.`
    };
  }, [selectedClientId, liveClientData]);

  // Asset allocation pie data for current client
  const assetAllocation = useMemo(() => {
    if (liveClientData?.asset_allocations && liveClientData.asset_allocations.length > 0) {
      return liveClientData.asset_allocations;
    }
    if (CLIENT_ASSET_ALLOCATIONS[selectedClientId]) {
      return CLIENT_ASSET_ALLOCATIONS[selectedClientId];
    }
    return [
      { name: 'Equity', value: 45.0, color: '#294E43' },
      { name: 'Fixed Income', value: 35.0, color: '#447062' },
      { name: 'Alternatives', value: 12.0, color: '#B37D2E' },
      { name: 'Cash', value: 8.0, color: '#82877D' },
    ];
  }, [selectedClientId, liveClientData]);

  // Pipeline 3 (Fault Lines) reference outputs
  const p3Metric = liveClientData?.p3_metric || pipeline3Data.metrics[selectedClientId] || null;
  const p3Threads = (liveClientData?.p3_threads && liveClientData.p3_threads.length > 0) 
    ? liveClientData.p3_threads 
    : (pipeline3Data.threads[selectedClientId] || []);
  const primaryAsset = assetAllocation[0] || { name: 'Equity', value: 50.0 };

  if (!client) {
    return (
      <div className="flex items-center justify-center h-full text-[#666A61] bg-[#F5F2EB]">
        Select a client to view portfolio details
      </div>
    );
  }

  const hasFacility = Boolean(client.hasFacility && client.triggerLtv != null);
  const lastIndex = client.snapshots.length - 1;
  const chartData = client.snapshots.map((s, idx) => {
    if (!hasFacility || s.ltv == null) {
      return { ...s, ltv: null };
    }
    const shockFactor = idx === lastIndex ? 1.0 : idx === lastIndex - 1 ? 0.3 : 0;
    const ltvImpact = (oilShock * 0.22) * shockFactor;
    return {
      ...s,
      ltv: Number((s.ltv + ltvImpact).toFixed(2)),
    };
  });

  const latestLtv = hasFacility && chartData[lastIndex].ltv != null ? chartData[lastIndex].ltv : null;
  const triggerLtv = hasFacility ? client.triggerLtv : null;
  const bufferPp = hasFacility && latestLtv != null ? (triggerLtv - latestLtv).toFixed(1) : null;
  const isBreached = hasFacility && latestLtv != null && latestLtv >= triggerLtv;
  const isWarning = hasFacility && bufferPp != null && Number(bufferPp) <= 1.0 && !isBreached;

  const progressScaleMax = hasFacility ? Math.max(triggerLtv + 10, 80) : 100;
  const ltvFillPercent = hasFacility && latestLtv != null ? Math.min(Math.max((latestLtv / progressScaleMax) * 100, 0), 100) : 0;
  const triggerMarkerPercent = hasFacility ? (triggerLtv / progressScaleMax) * 100 : 0;

  return (
    <div className="flex-1 h-full bg-[#F5F2EB] flex flex-col min-w-0 overflow-hidden">
      {/* Main Continuous Editorial Layout */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden w-full">
        
        {/* Continuous Report Column */}
        <div className="flex-1 px-8 lg:px-14 xl:px-20 py-8 space-y-10 overflow-y-auto w-full min-w-0">
          
          {/* Client Header */}
          <div className="flex items-center justify-between pb-6 border-b border-[#DADCD2]">
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-[#666A61] block mb-1">
                Client Dossier · {selectedClientId}
              </span>
              <h1 className="font-serif text-4xl lg:text-5xl font-normal text-[#252822] tracking-tight leading-none">
                {client.name}
              </h1>
            </div>
            <button
              onClick={onOpenAdvisory}
              className="bg-[#294E43] hover:bg-[#1D4036] text-[#F5F2EB] text-sm font-semibold px-5 py-2.5 rounded-[6px] flex items-center gap-2 transition-colors shadow-none cursor-pointer"
            >
              <span>Prepare outreach</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* 01 RISK OVERVIEW */}
          <section className="space-y-4">
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-2xl text-[#252822]">01</span>
              <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-[#252822]">
                Risk Overview
              </h2>
            </div>

            {hasFacility ? (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                <div className="md:col-span-7 space-y-2">
                  <span className="text-xs text-[#666A61] block">
                    {client.facilityType || 'Current Lombard LTV'}
                  </span>

                  <div className="font-serif text-5xl font-normal text-[#252822] tabular-nums tracking-tight">
                    {latestLtv.toFixed(1)}%
                  </div>

                  {/* Shared-scale LTV indicator track */}
                  <div className="relative w-full h-[6px] bg-[#EDEAE2] rounded-full my-2">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isBreached ? 'bg-[#B93832]' : isWarning ? 'bg-[#89600C]' : 'bg-[#294E43]'
                      }`}
                      style={{ width: `${ltvFillPercent}%` }}
                    />
                    {/* Red dashed trigger tick */}
                    <div
                      className="absolute top-[-4px] bottom-[-4px] w-[2px] border-l-2 border-dashed border-[#B93832]"
                      style={{ left: `${triggerMarkerPercent}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className={`font-medium ${
                      isBreached ? 'text-[#B93832]' : isWarning ? 'text-[#89600C]' : 'text-[#666A61]'
                    }`}>
                      {isBreached ? `${Math.abs(bufferPp)} pp breach` : `${bufferPp} pp below trigger`}
                    </span>
                    <span className="text-[#B93832] font-mono text-[11px]">
                      {triggerLtv.toFixed(1)}% trigger
                    </span>
                  </div>

                  {p3Metric && (
                    <div className="mt-3 p-2.5 bg-[#FBFAF7] border border-[#DADCD2] rounded-[4px] flex items-center justify-between text-[11px]">
                      <span className="text-[#666A61]">
                        <strong className="text-[#252822]">Fault Lines Metric:</strong> Collateral drop to liquidation:
                      </span>
                      <span className="font-mono font-bold text-[#B93832]">
                        ~{p3Metric.market_drop_to_trigger_pct.toFixed(2)}% drop
                      </span>
                    </div>
                  )}
                </div>

                <div className="md:col-span-5 text-sm leading-relaxed text-[#666A61] pt-4 md:pt-6">
                  {client.narrative}
                </div>
              </div>
            ) : (
              <div className="p-5 bg-[#FBFAF7] border border-[#DADCD2] rounded-[6px] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Shield className="w-4 h-4 text-[#294E43]" />
                    <span className="text-xs uppercase font-mono tracking-wider font-semibold text-[#294E43]">
                      Un-leveraged Portfolio (No Active Lombard Credit Facility)
                    </span>
                  </div>
                  <span className="text-xs font-mono text-[#666A61] bg-[#EDEAE2] px-2 py-0.5 rounded border border-[#DADCD2]">
                    Risk Profile: {client.risk_profile || 'Balanced'}
                  </span>
                </div>
                <p className="text-sm text-[#666A61] leading-relaxed">
                  {client.narrative}
                </p>
                <div className="text-xs text-[#666A61] pt-1 flex items-center gap-4">
                  <span><strong>Tax Domicile:</strong> {client.tax_domicile}</span>
                  <span><strong>Liquidity Status:</strong> {client.cashCall?.amount} ({client.cashCall?.horizon})</span>
                </div>
              </div>
            )}
          </section>


          <hr className="border-t border-[#DADCD2]" />

          {/* 02 EXPOSURE & ASSET ALLOCATION */}
          <section className="space-y-5">
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-2xl text-[#252822]">02</span>
              <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-[#252822]">
                Exposure & Asset Allocation
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 divide-y md:divide-y-0 md:divide-x divide-[#DADCD2] items-center">
              {/* Left Column: Look-through Concentration & Upcoming Liquidity */}
              <div className="md:col-span-6 space-y-6">
                <div className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[#666A61] block mb-1">
                    Top Look-Through Concentration
                  </span>
                  <span className="text-sm font-medium text-[#252822] block">
                    {client.concentration.name}
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="font-serif text-3xl text-[#252822] tabular-nums">
                      {client.concentration.value}%
                    </span>
                    <span className="text-xs text-[#666A61]">
                      vs {client.concentration.limit}% limit
                    </span>
                  </div>
                  <p className="text-xs text-[#666A61] leading-relaxed pt-1">
                    High look-through concentration across multiple portfolio instruments and wrappers.
                  </p>

                  {/* Pipeline 3 (Fault Lines) Thread-based unbundling */}
                  {p3Threads.length > 0 && (
                    <div className="mt-2.5 p-2.5 bg-[#FBFAF7] border border-[#DADCD2] rounded-[4px] space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-[#252822]">
                        <span>Fault Lines Unbundled Thread:</span>
                        <span className="font-mono text-[#294E43]">{p3Threads[0].pct_of_client_aum}% of AUM</span>
                      </div>
                      <div className="text-[11px] text-[#666A61] flex justify-between">
                        <span>Combined exposure:</span>
                        <span className="font-mono font-medium text-[#252822]">${(p3Threads[0].combined_market_value_usd / 1e6).toFixed(2)}m</span>
                      </div>
                      <div className="text-[10px] font-mono text-[#82877D] truncate">
                        Linked IDs: {p3Threads[0].instrument_ids.join(', ')}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-[#DADCD2]/70 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-[#666A61]">
                    <AlertCircle className="w-3.5 h-3.5 text-[#666A61]" />
                    <span className="uppercase tracking-[0.08em] font-semibold text-[11px]">Upcoming liquidity need</span>
                  </div>
                  <div className="font-serif text-3xl text-[#252822]">
                    {client.cashCall?.amount || 'No cash calls'}
                  </div>
                  <p className="text-xs text-[#666A61] pt-0.5">
                    {client.cashCall?.horizon || 'Liquidity runway remains unconstrained.'}
                  </p>
                </div>
              </div>

              {/* Right Column: Asset Allocation Donut / Pie Chart */}
              <div className="md:col-span-6 pt-6 md:pt-0 md:pl-8 flex flex-col items-center">
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[#666A61] mb-2 self-start md:self-center">
                  Portfolio Asset Allocation
                </span>

                <div className="relative w-[180px] h-[180px] flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={assetAllocation}
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={78}
                        paddingAngle={2.5}
                        dataKey="value"
                        stroke="#F5F2EB"
                        strokeWidth={2}
                      >
                        {assetAllocation.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </RechartsPieChart>
                  </ResponsiveContainer>

                  {/* Centered dominant percentage callout matching user reference */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                    <span className="font-serif text-2xl font-semibold text-[#252822] leading-none tabular-nums">
                      {primaryAsset.value}%
                    </span>
                    <span className="text-[10px] uppercase font-semibold text-[#666A61] tracking-wider mt-1">
                      {primaryAsset.name}
                    </span>
                  </div>
                </div>

                {/* Sleek Minimal Legend */}
                <div className="w-full mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                  {assetAllocation.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-[#666A61] truncate">{item.name}</span>
                      </div>
                      <span className="font-mono text-[#252822] font-semibold ml-2 tabular-nums">
                        {item.value}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <hr className="border-t border-[#DADCD2]" />

          {/* 03 PORTFOLIO TRAJECTORY */}
          <section className="space-y-4">
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-2">
                <span className="font-serif text-2xl text-[#252822]">03</span>
                <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-[#252822]">
                  {hasFacility ? 'LTV History (5 Snapshots)' : 'AUM Valuation History (5 Snapshots)'}
                </h2>
              </div>
              <span className="text-xs text-[#666A61] font-mono">
                {hasFacility ? `Collateral Value: $${client.snapshots[lastIndex].collateral}M USD` : `Total Wealth: $${client.snapshots[lastIndex].aum}M USD`}
              </span>
            </div>

            <div className="h-[220px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                {hasFacility ? (
                  <LineChart data={chartData} margin={{ top: 10, right: 30, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="2 2" stroke="#DADCD2" vertical={false} />
                    <XAxis
                      dataKey="date"
                      stroke="#666A61"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#DADCD2' }}
                    />
                    <YAxis
                      domain={[
                        Math.max(0, Math.floor(Math.min(...chartData.filter(d => d.ltv != null).map(d => d.ltv)) - 5)),
                        Math.ceil(Math.max(triggerLtv + 5, ...chartData.filter(d => d.ltv != null).map(d => d.ltv)) + 2)
                      ]}
                      stroke="#666A61"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine
                      y={triggerLtv}
                      stroke="#B93832"
                      strokeDasharray="3 3"
                      strokeWidth={1.5}
                      label={{
                        value: `${triggerLtv.toFixed(1)}% trigger`,
                        position: 'right',
                        fill: '#B93832',
                        fontSize: 11,
                        fontFamily: 'monospace'
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="ltv"
                      stroke="#12332B"
                      strokeWidth={2}
                      dot={{ fill: '#12332B', r: 3.5, stroke: '#F5F2EB', strokeWidth: 1.5 }}
                      activeDot={{ r: 5, fill: '#294E43' }}
                    />
                  </LineChart>
                ) : (
                  <LineChart data={client.snapshots} margin={{ top: 10, right: 30, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="2 2" stroke="#DADCD2" vertical={false} />
                    <XAxis
                      dataKey="date"
                      stroke="#666A61"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#DADCD2' }}
                    />
                    <YAxis
                      domain={['auto', 'auto']}
                      stroke="#666A61"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      unit="M"
                    />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="aum"
                      name="AUM ($M)"
                      stroke="#294E43"
                      strokeWidth={2}
                      dot={{ fill: '#294E43', r: 3.5, stroke: '#F5F2EB', strokeWidth: 1.5 }}
                      activeDot={{ r: 5, fill: '#12332B' }}
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* Key Event Callout */}
            <div className="p-3 bg-[#FBFAF7] border border-[#DADCD2] rounded-[4px] flex items-center gap-3 text-xs">
              <span className="px-2 py-0.5 bg-[#EDEAE2] text-[#252822] font-semibold uppercase text-[10px] tracking-wider rounded shrink-0">
                Grounded Macro Event — {client.eventDate}
              </span>
              <p className="text-[#666A61] leading-tight">
                {client.eventDetails}
              </p>
            </div>
          </section>

          <hr className="border-t border-[#DADCD2]" />

          {/* 04 HISTORICAL REPLAY & WHAT-IF */}
          <section className="space-y-4">
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-2xl text-[#252822]">04</span>
              <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-[#252822]">
                {hasFacility ? 'Scenario Stress Simulation' : 'Historical Shock Replay'}
              </h2>
            </div>

            {hasFacility ? (
              <div className="p-5 bg-[#FBFAF7] border border-[#DADCD2] rounded-[6px] space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold text-[#252822] block">
                      Energy / Geopolitical Shock Sensitivity
                    </span>
                    <span className="text-xs text-[#666A61]">
                      Re-evaluates collateral valuation and LTV headroom live under sudden price moves.
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setOilShock(0)}
                      className={`px-2.5 py-1 text-xs rounded border transition-colors cursor-pointer ${
                        oilShock === 0
                          ? 'bg-[#294E43] text-[#F5F2EB] border-[#294E43]'
                          : 'bg-white text-[#252822] border-[#DADCD2] hover:bg-[#EDEAE2]'
                      }`}
                    >
                      Baseline (0%)
                    </button>
                    <button
                      onClick={() => setOilShock(25)}
                      className={`px-2.5 py-1 text-xs rounded border transition-colors cursor-pointer ${
                        oilShock === 25
                          ? 'bg-[#294E43] text-[#F5F2EB] border-[#294E43]'
                          : 'bg-white text-[#252822] border-[#DADCD2] hover:bg-[#EDEAE2]'
                      }`}
                    >
                      Hormuz (+25%)
                    </button>
                    <button
                      onClick={() => setOilShock(45)}
                      className={`px-2.5 py-1 text-xs rounded border transition-colors cursor-pointer ${
                        oilShock === 45
                          ? 'bg-[#294E43] text-[#F5F2EB] border-[#294E43]'
                          : 'bg-white text-[#252822] border-[#DADCD2] hover:bg-[#EDEAE2]'
                      }`}
                    >
                      Escalation (+45%)
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={oilShock}
                    onChange={(e) => setOilShock(Number(e.target.value))}
                    className="flex-1 accent-[#294E43] cursor-pointer"
                  />
                  <span className="text-xs font-mono font-bold text-[#294E43] w-12 text-right">
                    +{oilShock}%
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-5 bg-[#FBFAF7] border border-[#DADCD2] rounded-[6px] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-widest text-[#B93832] font-semibold">
                    {client.historicalReplay?.label || 'HISTORICAL REPLAY ONLY'}
                  </span>
                  <span className="text-xs font-mono font-bold text-[#252822]">
                    Expected move: {client.historicalReplay?.hypothetical_expected_move_pct}%
                  </span>
                </div>
                <p className="text-xs text-[#252822] font-medium">
                  {client.historicalReplay?.referenced_event}
                </p>
                <p className="text-[11px] text-[#666A61] italic leading-relaxed">
                  {client.historicalReplay?.disclaimer}
                </p>
              </div>
            )}
          </section>

        </div>

        {/* AT A GLANCE Facts Margin Column (Right side, 260-280px) */}
        <aside className="w-full lg:w-[280px] shrink-0 border-t lg:border-t-0 lg:border-l border-[#DADCD2] px-6 py-8 lg:px-7 lg:py-12 bg-[#F5F2EB]/80 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#DADCD2]">
              <span className="text-[11px] font-mono uppercase tracking-[0.12em] text-[#666A61] font-semibold">
                At A Glance
              </span>
              <span className="text-[10px] font-mono text-[#82877D] bg-[#EDEAE2] px-1.5 py-0.5 rounded border border-[#DADCD2]/60">
                Live Dossier
              </span>
            </div>

            <div className="space-y-5 text-sm">
              {/* Adviser */}
              <div className="p-3 bg-[#FBFAF7] border border-[#DADCD2]/70 rounded-[6px] flex items-start gap-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                <div className="p-1.5 bg-[#EDEAE2] rounded text-[#294E43] mt-0.5 shrink-0">
                  <User className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-[11px] text-[#666A61] block font-mono">Lead Adviser</span>
                  <span className="font-semibold text-[#252822] text-sm">Priscilla Ong</span>
                  <span className="text-[10px] text-[#82877D] block">Julius Baer Private Banking</span>
                </div>
              </div>

              {/* Estimated USD AUM */}
              <div className="p-3 bg-[#FBFAF7] border border-[#DADCD2]/70 rounded-[6px] flex items-start gap-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                <div className="p-1.5 bg-[#EDEAE2] rounded text-[#294E43] mt-0.5 shrink-0">
                  <DollarSign className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-[11px] text-[#666A61] block font-mono">Estimated USD AUM</span>
                  <span className="font-serif text-2xl text-[#252822] block font-normal leading-tight">
                    ${client.snapshots[lastIndex].aum.toFixed(1)}m
                  </span>
                  <span className="text-[11px] text-[#82877D]">Total modeled wealth</span>
                </div>
              </div>

              {/* Current LTV / Credit Facility */}
              <div className="p-3 bg-[#FBFAF7] border border-[#DADCD2]/70 rounded-[6px] flex items-start gap-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                <div className="p-1.5 bg-[#EDEAE2] rounded text-[#294E43] mt-0.5 shrink-0">
                  <Shield className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-[11px] text-[#666A61] block font-mono">
                    {hasFacility ? 'Current LTV' : 'Credit Facility'}
                  </span>
                  {hasFacility ? (
                    <>
                      <span className="font-serif text-2xl text-[#252822] block font-normal leading-tight">
                        {latestLtv.toFixed(1)}%
                      </span>
                      <span className={`text-[11px] font-medium block ${
                        isBreached ? 'text-[#B93832]' : isWarning ? 'text-[#89600C]' : 'text-[#666A61]'
                      }`}>
                        {isBreached ? `${Math.abs(bufferPp)} pp breach` : `${bufferPp} pp below trigger`}
                      </span>
                      <span className="text-[10px] text-[#B93832] font-mono">{triggerLtv.toFixed(1)}% trigger</span>
                    </>
                  ) : (
                    <>
                      <span className="font-serif text-xl text-[#252822] block font-normal leading-tight">
                        None
                      </span>
                      <span className="text-[11px] text-[#82877D] block leading-tight">
                        Un-leveraged portfolio
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Concentration */}
              <div className="p-3 bg-[#FBFAF7] border border-[#DADCD2]/70 rounded-[6px] flex items-start gap-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                <div className="p-1.5 bg-[#EDEAE2] rounded text-[#294E43] mt-0.5 shrink-0">
                  <PieChart className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] text-[#666A61] block font-mono">Top Look-Through</span>
                  <span className="font-medium text-[#252822] text-xs block truncate max-w-[170px]">
                    {client.concentration.name}
                  </span>
                  <span className="font-serif text-xl text-[#252822] block">
                    {client.concentration.value}% <span className="text-xs font-sans text-[#82877D]">vs {client.concentration.limit}% limit</span>
                  </span>
                </div>
              </div>

              {/* Liquidity */}
              <div className="p-3 bg-[#FBFAF7] border border-[#DADCD2]/70 rounded-[6px] flex items-start gap-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                <div className="p-1.5 bg-[#EDEAE2] rounded text-[#294E43] mt-0.5 shrink-0">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-[11px] text-[#666A61] block font-mono">Liquidity Horizon</span>
                  <span className="font-serif text-xl text-[#252822] block">
                    {client.cashCall?.amount || 'Adequate'}
                  </span>
                  <span className="text-[11px] text-[#82877D] block leading-tight">
                    {client.cashCall?.horizon || 'No capital calls'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </aside>

      </div>
    </div>
  );
}
