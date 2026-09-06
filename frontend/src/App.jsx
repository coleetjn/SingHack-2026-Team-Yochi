import React, { useState } from 'react';
import Triage from './components/Triage';
import Canvas from './components/Canvas';
import Advisory from './components/Advisory';

function App() {
  const [selectedClientId, setSelectedClientId] = useState('CL-0014');
  const [isAdvisoryOpen, setIsAdvisoryOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#F5F2EB] text-[#252822] font-sans antialiased selection:bg-[#294E43] selection:text-[#F5F2EB]">
      {/* Top Bar (approx 64px high, fine bottom divider, adviser identity on right) */}
      <header className="h-16 bg-[#F5F2EB] border-b border-[#DADCD2] flex items-center px-6 lg:px-10 justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          {/* Restrained brand mark matching editorial reference */}
          <div className="flex items-center gap-2.5">
            <svg
              className="w-5 h-5 text-[#252822]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
            <div className="flex items-baseline gap-1.5">
              <span className="font-serif text-lg tracking-tight text-[#252822]">Yochi</span>
              <span className="text-xs font-sans text-[#666A61] tracking-normal">Workbench</span>
            </div>
          </div>
        </div>

        {/* Adviser profile */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-wider text-[#666A61]">Adviser</div>
            <div className="text-sm font-semibold text-[#252822]">Priscilla Ong</div>
          </div>
          <div className="w-9 h-9 rounded-full bg-[#12332B] text-[#F5F2EB] flex items-center justify-center font-semibold text-xs tracking-wider border border-[#21483C]">
            PO
          </div>
        </div>
      </header>

      {/* Main Continuous Workspace: Sidebar (Triage) + Main Report Canvas */}
      <div className="flex-1 flex min-h-0 relative overflow-hidden">
        {/* Left Sidebar: Dark Forest Client Queue */}
        <Triage 
          selectedClientId={selectedClientId} 
          onSelectClient={setSelectedClientId}
          onOpenAdvisory={() => setIsAdvisoryOpen(true)}
        />

        {/* Center & Right: Continuous Report Canvas + Facts Margin */}
        <div className="flex-1 min-w-0 h-full relative overflow-hidden bg-[#F5F2EB]">
          <Canvas 
            selectedClientId={selectedClientId}
            onOpenAdvisory={() => setIsAdvisoryOpen(true)}
          />
        </div>
      </div>

      {/* On-Demand Slide-over Advisory Drawer */}
      <Advisory
        selectedClientId={selectedClientId}
        isOpen={isAdvisoryOpen}
        onClose={() => setIsAdvisoryOpen(false)}
      />
    </div>
  );
}

export default App;
