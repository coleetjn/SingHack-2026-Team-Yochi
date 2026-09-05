import React, { useState } from 'react';
import { Search, Settings, ChevronLeft, ChevronRight } from 'lucide-react';

export const realClients = [
  { id: 'CL-0014', name: 'Lau Chi Ming', status: 'critical', urgency: 92, reason: 'LTV 69.4% vs 70% trigger', creditScore: 94, liquidityScore: 88, horizonDays: '240d' },
  { id: 'CL-0002', name: 'Ravi Chandrasekaran', status: 'critical', urgency: 88, reason: 'Margin call breach (75.64%)', creditScore: 92, liquidityScore: 84, horizonDays: '60d' },
  { id: 'CL-0003', name: 'Sarah Jenkins', status: 'warning', urgency: 65, reason: 'High concentration in Tech', creditScore: 55, liquidityScore: 78, horizonDays: '110d' },
  { id: 'CL-0004', name: 'Tan Ah Kow', status: 'warning', urgency: 62, reason: 'Approaching mandate limit', creditScore: 62, liquidityScore: 70, horizonDays: '270d' },
  { id: 'CL-0005', name: 'Elena Rostova', status: 'stable', urgency: 45, reason: 'Stable', creditScore: 30, liquidityScore: 35, horizonDays: '420d' },
  { id: 'CL-0006', name: 'Michael Chang', status: 'stable', urgency: 42, reason: 'Stable', creditScore: 58, liquidityScore: 75, horizonDays: '90d' },
  { id: 'CL-0007', name: 'David Wong', status: 'stable', urgency: 40, reason: 'Stable', creditScore: 38, liquidityScore: 42, horizonDays: '300d' },
  { id: 'CL-0008', name: 'Emma Watson', status: 'stable', urgency: 38, reason: 'Stable', creditScore: 35, liquidityScore: 40, horizonDays: '365d' },
  { id: 'CL-0009', name: 'James Smith', status: 'stable', urgency: 35, reason: 'Stable', creditScore: 25, liquidityScore: 35, horizonDays: '450d' },
  { id: 'CL-0010', name: 'Olivia Jones', status: 'stable', urgency: 33, reason: 'Stable', creditScore: 10, liquidityScore: 14, horizonDays: '700d' },
  { id: 'CL-0011', name: 'William Brown', status: 'stable', urgency: 30, reason: 'Stable', creditScore: 20, liquidityScore: 25, horizonDays: '540d' },
  { id: 'CL-0012', name: 'Sophia Davis', status: 'stable', urgency: 28, reason: 'Stable', creditScore: 52, liquidityScore: 68, horizonDays: '180d' },
  { id: 'CL-0013', name: 'Alexander Miller', status: 'stable', urgency: 25, reason: 'Stable', creditScore: 42, liquidityScore: 35, horizonDays: '400d' },
  { id: 'CL-0015', name: 'Isabella Wilson', status: 'stable', urgency: 22, reason: 'Stable', creditScore: 30, liquidityScore: 25, horizonDays: '520d' },
  { id: 'CL-0016', name: 'Daniel Moore', status: 'stable', urgency: 20, reason: 'Stable', creditScore: 18, liquidityScore: 22, horizonDays: '600d' },
  { id: 'CL-0017', name: 'Mia Taylor', status: 'stable', urgency: 18, reason: 'Stable', creditScore: 45, liquidityScore: 65, horizonDays: '120d' },
  { id: 'CL-0018', name: 'Matthew Anderson', status: 'stable', urgency: 15, reason: 'Stable', creditScore: 28, liquidityScore: 30, horizonDays: '500d' },
  { id: 'CL-0019', name: 'Charlotte Thomas', status: 'stable', urgency: 12, reason: 'Stable', creditScore: 68, liquidityScore: 72, horizonDays: '150d' },
  { id: 'CL-0020', name: 'Joseph Jackson', status: 'stable', urgency: 10, reason: 'Stable', creditScore: 15, liquidityScore: 18, horizonDays: '650d' },
  { id: 'CL-0021', name: 'Amelia White', status: 'stable', urgency: 8, reason: 'Stable', creditScore: 12, liquidityScore: 15, horizonDays: '720d' },
];

const StatusIndicator = ({ status }) => {
  if (status === 'critical') return <span className="w-2 h-2 rounded-full shrink-0 bg-[#FF8B80]" />;
  if (status === 'warning') return <span className="w-2 h-2 rounded-full shrink-0 bg-[#F4C76A]" />;
  return <span className="w-2 h-2 rounded-full shrink-0 bg-[#9DCEB8]" />;
};

export default function Triage({ selectedClientId, onSelectClient, onOpenAdvisory }) {
  const [search, setSearch] = useState('');

  const filteredClients = realClients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.id.toLowerCase().includes(search.toLowerCase()) ||
    c.reason.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <aside className="w-[260px] lg:w-[272px] shrink-0 h-full bg-[#12332B] text-[#F5F2EB] flex flex-col justify-between select-none border-r border-[#1D4036]">
      {/* Brand Header */}
      <div className="px-5 pt-5 pb-4 border-b border-[#1D4036]/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 border border-[#C4D3CA]/40 rounded flex items-center justify-center text-xs font-serif font-bold text-[#F5F2EB]">
            A
          </div>
          <span className="font-serif text-lg tracking-tight text-[#F5F2EB]">Aegis</span>
          <span className="text-[13px] text-[#C4D3CA] font-normal tracking-wide">Workbench</span>
        </div>
      </div>

      {/* Client Queue Header & Search */}
      <div className="px-5 pt-4 pb-2">
        <div className="flex items-center justify-between text-xs tracking-wider uppercase text-[#C4D3CA] font-semibold mb-2">
          <span>Client Queue</span>
          <span className="text-[11px] tabular-nums font-mono opacity-80">{realClients.length} clients</span>
        </div>
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#C4D3CA]/60" />
          <input
            type="text"
            placeholder="Search book..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#1A4036] text-xs text-[#F5F2EB] placeholder-[#C4D3CA]/50 pl-8 pr-3 py-1.5 rounded-[4px] border border-transparent focus:border-[#C4D3CA]/40 focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Scrollable Client List */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {filteredClients.map((client) => {
          const isSelected = selectedClientId === client.id;
          return (
            <div
              key={client.id}
              onClick={() => onSelectClient(client.id)}
              className={`group relative px-3 py-2.5 rounded-[4px] cursor-pointer transition-colors duration-150 ${
                isSelected
                  ? 'bg-[#21483C] text-[#F5F2EB]'
                  : 'hover:bg-[#1A4036]/60 text-[#C4D3CA]'
              }`}
            >
              {isSelected && (
                <div className="absolute left-0 top-1 bottom-1 w-[3px] bg-[#9DCEB8] rounded-r" />
              )}
              
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-2 min-w-0">
                  <StatusIndicator status={client.status} />
                  <span className={`text-[14px] font-semibold truncate ${isSelected ? 'text-[#F5F2EB]' : 'text-[#E5EBE7]'}`}>
                    {client.name}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2" title="Attention-Score Aggregator (Risk + Liquidity + Urgency)">
                  <span className="text-[10px] uppercase tracking-wider text-[#C4D3CA]/70">Attention</span>
                  <span className={`text-xs font-semibold tabular-nums ${
                    client.status === 'critical' ? 'text-[#FF8B80]' : client.status === 'warning' ? 'text-[#F4C76A]' : 'text-[#9DCEB8]'
                  }`}>
                    {client.urgency}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-[#C4D3CA]/80 pl-4">
                <span className="font-mono text-[10px]">{client.id}</span>
              </div>

              <div className="text-[11px] leading-tight text-[#C4D3CA]/75 pl-4 mt-0.5 line-clamp-1">
                {client.reason}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Utilities */}
      <div className="p-3 border-t border-[#1D4036] space-y-1 text-xs text-[#C4D3CA]">
        {onOpenAdvisory && (
          <button
            onClick={onOpenAdvisory}
            className="w-full flex items-center justify-between px-3 py-2 rounded hover:bg-[#1A4036] transition-colors text-left font-medium"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#9DCEB8] animate-pulse" />
              <span>Advisory Synthesis</span>
            </div>
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 bg-[#21483C] text-[#9DCEB8] rounded font-mono">
              AI
            </span>
          </button>
        )}
        <div className="flex items-center justify-between px-3 py-1.5 text-[11px] text-[#C4D3CA]/60">
          <div className="flex items-center gap-1.5">
            <Settings className="w-3.5 h-3.5" />
            <span>Settings</span>
          </div>
          <div className="flex items-center gap-1 cursor-pointer hover:text-[#C4D3CA]">
            <ChevronLeft className="w-3 h-3" />
            <span>Collapse</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
