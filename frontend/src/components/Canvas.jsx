import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot
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

// Master telemetry database for clients
const CLIENT_DATABASE = {
  'CL-0014': {
    name: 'Lau Chi Ming',
    snapshots: [
      { date: 'Jan 31', ltv: 53.9, collateral: 32.1, aum: 26.5 },
      { date: 'Feb 28', ltv: 58.2, collateral: 30.5, aum: 25.1 },
      { date: 'Mar 31', ltv: 65.1, collateral: 27.8, aum: 24.2 },
      { date: 'Apr 30', ltv: 67.5, collateral: 26.5, aum: 23.8 },
      { date: 'May 31', ltv: 69.4, collateral: 25.8, aum: 23.1 },
    ],
    triggerLtv: 70.0,
    concentration: { name: 'Golden Harbour Properties', value: 29, limit: 12 },
    eventDetails: 'Strait of Hormuz closure (March event) led to forced drawdown for accumulator.',
    eventDate: 'Mar 31',
    cashCall: { amount: 'HKD 60m', horizon: 'Cash call in 8 months.' },
    narrative: 'Your Lombard facility LTV has reached 69.4%, very close to the 70.0% margin call trigger.'
  },
  'CL-0002': {
    name: 'Ravi Chandrasekaran',
    snapshots: [
      { date: 'Apr 30', ltv: 68.2, collateral: 50.1, aum: 48.2 },
      { date: 'May 31', ltv: 72.1, collateral: 47.5, aum: 45.1 },
      { date: 'Jun 30', ltv: 75.64, collateral: 45.2, aum: 44.5 },
      { date: 'Jul 31', ltv: 73.5, collateral: 46.5, aum: 45.8 },
      { date: 'Aug 31', ltv: 71.2, collateral: 48.0, aum: 46.7 },
    ],
    triggerLtv: 75.0,
    concentration: { name: 'Tech Holdings (Custody)', value: 68, limit: 100 },
    eventDetails: 'Margin call breach in June bracketed by a poorly timed trade against RM advice.',
    eventDate: 'Jun 30',
    cashCall: { amount: 'USD 1.7m', horizon: 'Secondary pre-IPO drawdown' },
    narrative: 'In June, LTV breached the 75% trigger (reaching 75.64%), requiring a $54,762 cure. Passively cured by market recovery.'
  }
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

  const client = useMemo(() => {
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
  }, [selectedClientId]);

  if (!client) {
    return (
      <div className="flex items-center justify-center h-full text-[#666A61] bg-[#F5F2EB]">
        Select a client to view portfolio details
      </div>
    );
  }

  // Calculate forward stressed telemetry
  const lastIndex = client.snapshots.length - 1;
  const chartData = client.snapshots.map((s, idx) => {
    const shockFactor = idx === lastIndex ? 1.0 : idx === lastIndex - 1 ? 0.3 : 0;
    const ltvImpact = (oilShock * 0.22) * shockFactor;
    return {
      ...s,
      ltv: Number((s.ltv + ltvImpact).toFixed(2)),
    };
  });

  const latestLtv = chartData[lastIndex].ltv;
  const bufferPp = (client.triggerLtv - latestLtv).toFixed(1);
  const isBreached = latestLtv >= client.triggerLtv;
  const isWarning = bufferPp <= 1.0 && !isBreached;

  // Exact math: progress bar percentage clamped between 0 and 100
  // Scaling up to 80% LTV so 70% sits accurately near 87.5% mark
  const progressScaleMax = Math.max(client.triggerLtv + 10, 80);
  const ltvFillPercent = Math.min(Math.max((latestLtv / progressScaleMax) * 100, 0), 100);
  const triggerMarkerPercent = (client.triggerLtv / progressScaleMax) * 100;

  return (
    <div className="flex-1 h-full bg-[#F5F2EB] flex flex-col min-w-0 overflow-y-auto">
      {/* Top Bar */}
      <header className="h-16 px-8 lg:px-10 border-b border-[#DADCD2] flex items-center justify-between shrink-0 bg-[#F5F2EB]">
        <div className="text-xs text-[#666A61] font-mono tracking-wide">
          <span>PORTFOLIO INTELLIGENCE</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[11px] uppercase tracking-wider text-[#666A61] block leading-none mb-1">Adviser</span>
            <span className="text-sm font-semibold text-[#252822]">Priscilla Ong</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#12332B] text-[#F5F2EB] flex items-center justify-center text-xs font-semibold">
            PO
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-[#666A61]" />
        </div>
      </header>

      {/* Main Continuous Editorial Layout */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        
        {/* Continuous Report Column */}
        <div className="flex-1 px-8 lg:px-12 py-8 space-y-9 overflow-y-auto max-w-[920px]">
          
          {/* Client Header */}
          <div className="flex items-start justify-between pb-6 border-b border-[#DADCD2]">
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-[#666A61] block mb-2">
                {selectedClientId}
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

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              <div className="md:col-span-7 space-y-2">
                <span className="text-xs text-[#666A61] block">Current LTV</span>
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
                    {client.triggerLtv.toFixed(1)}% trigger
                  </span>
                </div>
              </div>

              <div className="md:col-span-5 text-sm leading-relaxed text-[#666A61] pt-4 md:pt-6">
                {client.narrative}
              </div>
            </div>
          </section>

          <hr className="border-t border-[#DADCD2]" />

          {/* 02 EXPOSURE */}
          <section className="space-y-4">
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-2xl text-[#252822]">02</span>
              <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-[#252822]">
                Exposure
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 divide-y md:divide-y-0 md:divide-x divide-[#DADCD2]">
              {/* Concentration */}
              <div className="space-y-1">
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
                  High look-through concentration across multiple instruments.
                </p>
              </div>

              {/* Upcoming Liquidity Need */}
              <div className="pt-4 md:pt-0 md:pl-8 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-[#666A61]">
                  <AlertCircle className="w-3.5 h-3.5 text-[#666A61]" />
                  <span>Upcoming liquidity need</span>
                </div>
                <div className="font-serif text-3xl text-[#252822]">
                  {client.cashCall?.amount || 'No cash calls'}
                </div>
                <p className="text-xs text-[#666A61] pt-1">
                  {client.cashCall?.horizon || 'Liquidity runway remains unconstrained.'}
                </p>
              </div>
            </div>
          </section>

          <hr className="border-t border-[#DADCD2]" />

          {/* 03 LTV HISTORY (5 MONTHS) */}
          <section className="space-y-4">
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-2">
                <span className="font-serif text-2xl text-[#252822]">03</span>
                <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-[#252822]">
                  LTV History (5 Months)
                </h2>
              </div>
            </div>

            <div className="h-[220px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 30, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#DADCD2" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#666A61"
                    tick={{ fill: '#666A61', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    dy={5}
                  />
                  <YAxis
                    stroke="#666A61"
                    domain={[45, 80]}
                    tick={{ fill: '#666A61', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    ticks={[50, 54, 58, 62, 66, 70, 74]}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine
                    y={client.triggerLtv}
                    stroke="#B93832"
                    strokeDasharray="4 4"
                    label={{
                      position: 'right',
                      value: `${client.triggerLtv.toFixed(1)}% trigger`,
                      fill: '#B93832',
                      fontSize: 10,
                      fontWeight: 600
                    }}
                  />
                  {client.eventDate && (
                    <ReferenceDot
                      x={client.eventDate}
                      y={chartData.find(d => d.date === client.eventDate)?.ltv}
                      r={4}
                      fill="#294E43"
                      stroke="#F5F2EB"
                      strokeWidth={2}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="ltv"
                    name="LTV (%)"
                    stroke="#1D4036"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#1D4036' }}
                    activeDot={{ r: 5, fill: '#294E43' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Event pill */}
            {client.eventDetails && (
              <div className="flex items-center gap-3 pt-2 text-xs">
                <span className="px-2.5 py-1 bg-[#EDEAE2] text-[#252822] font-semibold uppercase tracking-wider text-[10px] rounded-[3px]">
                  Key Event — {client.eventDate}
                </span>
                <span className="text-[#666A61] text-xs truncate">
                  {client.eventDetails}
                </span>
              </div>
            )}
          </section>

          <hr className="border-t border-[#DADCD2]" />

          {/* 04 SCENARIO STRESS TEST */}
          <section className="space-y-4 pb-6">
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-2xl text-[#252822]">04</span>
              <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-[#252822]">
                Scenario Stress Simulation
              </h2>
            </div>

            <div className="p-4 bg-[#FBFAF7] border border-[#DADCD2] rounded-[6px] space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-medium text-[#252822]">
                  Macro Replay Presets (from event_log.csv):
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setOilShock(0)}
                    className={`px-3 py-1 text-xs font-semibold rounded-[4px] border transition-colors ${
                      oilShock === 0 ? 'bg-[#294E43] text-[#F5F2EB] border-[#294E43]' : 'bg-[#EDEAE2] border-transparent text-[#252822]'
                    }`}
                  >
                    Baseline
                  </button>
                  <button
                    onClick={() => setOilShock(25)}
                    className={`px-3 py-1 text-xs font-semibold rounded-[4px] border transition-colors ${
                      oilShock === 25 ? 'bg-[#294E43] text-[#F5F2EB] border-[#294E43]' : 'bg-[#EDEAE2] border-transparent text-[#252822]'
                    }`}
                  >
                    Hormuz (+25%)
                  </button>
                  <button
                    onClick={() => setOilShock(45)}
                    className={`px-3 py-1 text-xs font-semibold rounded-[4px] border transition-colors ${
                      oilShock === 45 ? 'bg-[#294E43] text-[#F5F2EB] border-[#294E43]' : 'bg-[#EDEAE2] border-transparent text-[#252822]'
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
          </section>

        </div>

        {/* AT A GLANCE Facts Margin Column (Right side, 240-280px) */}
        <aside className="w-full lg:w-[260px] shrink-0 border-t lg:border-t-0 lg:border-l border-[#DADCD2] p-6 lg:p-8 space-y-7 bg-[#F5F2EB]">
          <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[#666A61]">
            At A Glance
          </div>

          <div className="space-y-6 text-sm">
            {/* Adviser */}
            <div className="flex items-start gap-3">
              <User className="w-4 h-4 text-[#666A61] mt-0.5 shrink-0" />
              <div>
                <span className="text-xs text-[#666A61] block">Adviser</span>
                <span className="font-semibold text-[#252822]">Priscilla Ong</span>
              </div>
            </div>

            {/* Estimated USD AUM */}
            <div className="flex items-start gap-3">
              <DollarSign className="w-4 h-4 text-[#666A61] mt-0.5 shrink-0" />
              <div>
                <span className="text-xs text-[#666A61] block">Estimated USD AUM</span>
                <span className="font-serif text-2xl text-[#252822] block font-normal leading-tight">
                  ${client.snapshots[lastIndex].aum.toFixed(1)}m
                </span>
                <span className="text-[11px] text-[#666A61]">Total modeled wealth</span>
              </div>
            </div>

            {/* Current LTV */}
            <div className="flex items-start gap-3">
              <Shield className="w-4 h-4 text-[#666A61] mt-0.5 shrink-0" />
              <div>
                <span className="text-xs text-[#666A61] block">Current LTV</span>
                <span className="font-serif text-2xl text-[#252822] block font-normal leading-tight">
                  {latestLtv.toFixed(1)}%
                </span>
                <span className={`text-[11px] font-medium block ${
                  isBreached ? 'text-[#B93832]' : isWarning ? 'text-[#89600C]' : 'text-[#666A61]'
                }`}>
                  {isBreached ? `${Math.abs(bufferPp)} pp breach` : `${bufferPp} pp below trigger`}
                </span>
                <span className="text-[10px] text-[#B93832]">{client.triggerLtv.toFixed(1)}% trigger</span>
              </div>
            </div>

            {/* Concentration */}
            <div className="flex items-start gap-3">
              <PieChart className="w-4 h-4 text-[#666A61] mt-0.5 shrink-0" />
              <div>
                <span className="text-xs text-[#666A61] block">Concentration</span>
                <span className="font-medium text-[#252822] text-xs block truncate max-w-[170px]">
                  {client.concentration.name}
                </span>
                <span className="font-serif text-xl text-[#252822] block">
                  {client.concentration.value}% <span className="text-xs font-sans text-[#666A61]">vs {client.concentration.limit}% limit</span>
                </span>
              </div>
            </div>

            {/* Liquidity */}
            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 text-[#666A61] mt-0.5 shrink-0" />
              <div>
                <span className="text-xs text-[#666A61] block">Liquidity</span>
                <span className="font-serif text-xl text-[#252822] block">
                  {client.cashCall?.amount || 'Adequate'}
                </span>
                <span className="text-[11px] text-[#666A61] block leading-tight">
                  {client.cashCall?.horizon || 'No capital calls'}
                </span>
              </div>
            </div>
          </div>
        </aside>

      </div>
    </div>
  );
}
