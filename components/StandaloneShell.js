'use client';

import { useState } from 'react';
import { 
  ImageStudio, 
  VideoStudio, 
  LipSyncStudio, 
  CinemaStudio, 
  FingerprintLogoIcon, 
  GearIcon,
  VideoCameraIcon,
  ImageIcon,
  MicrophoneIcon,
  ClapperboardIcon
} from 'studio';

const TABS = [
  { id: 'video', label: 'Video Studio', shortLabel: 'Video', icon: <VideoCameraIcon className="w-4 h-4" /> },
  { id: 'image', label: 'Image Studio', shortLabel: 'Image', icon: <ImageIcon className="w-4 h-4" /> },
  { id: 'lipsync', label: 'Audio / LipSync', shortLabel: 'Audio', icon: <MicrophoneIcon className="w-4 h-4" /> },
  { id: 'cinema', label: 'Cinema Studio', shortLabel: 'Cinema', icon: <ClapperboardIcon className="w-4 h-4" /> },
];

export default function StandaloneShell() {
  const [activeTab, setActiveTab] = useState('video');
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="h-screen bg-[var(--bg-app,rgb(9,9,11))] flex flex-row overflow-hidden text-white select-none">
      {/* ──────────────────────────────────────────────────────────
          FAR-LEFT NAVIGATION RAIL (DOCK)
          ────────────────────────────────────────────────────────── */}
      <aside className="w-16 flex-shrink-0 bg-[var(--bg-header,#0d0d12)] flex flex-col items-center justify-between py-3.5 border-r border-white/[0.04] z-30 select-none">
        {/* Top: Logo & Main Navigation */}
        <div className="flex flex-col items-center gap-6 w-full">
          {/* Fingerprint Logo */}
          <div 
            title="Local AI Studio"
            className="w-10 h-10 rounded-xl bg-[var(--color-accent-subtle)] flex items-center justify-center text-[var(--color-accent)] shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => setActiveTab('video')}
          >
            <FingerprintLogoIcon className="w-6 h-6 text-white/90" />
          </div>

          {/* Vertical Studio Switcher */}
          <nav aria-label="Studios" className="flex flex-col items-center gap-2 w-full px-2">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  aria-pressed={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  title={tab.label}
                  className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all duration-200 group relative ${
                    isActive
                      ? 'bg-[var(--color-accent)] text-white shadow-md'
                      : 'text-white/45 hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  {tab.icon}
                  <span className="text-[9px] font-semibold leading-none tracking-tight">
                    {tab.shortLabel}
                  </span>
                  
                  {/* Tooltip on hover */}
                  <div className="absolute left-full ml-2.5 px-2.5 py-1 rounded-lg bg-[#181822] text-white text-xs font-semibold whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-2xl border border-white/10">
                    {tab.label}
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom: Engine Status Indicator & Settings */}
        <div className="flex flex-col items-center gap-3 w-full px-2">
          {/* Live Engine Pulse */}
          <div 
            title="Local Engine Active · Wan2GP & MiniMax H3 (127.0.0.1:3000)"
            className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center cursor-help group relative hover:bg-emerald-500/15 transition-colors"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            
            {/* Tooltip on hover */}
            <div className="absolute left-full ml-2.5 px-3 py-2 rounded-lg bg-[#181822] text-white text-[11px] font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-2xl border border-white/10 flex flex-col gap-0.5">
              <span className="font-bold text-emerald-400">Local Engine Active</span>
              <span className="text-[10px] text-white/60">Wan2GP & H3 · 127.0.0.1:3000</span>
            </div>
          </div>

          {/* Settings Button */}
          <button
            onClick={() => setShowSettings(true)}
            title="Settings"
            className="w-11 h-11 rounded-xl flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.06] transition-all duration-200"
          >
            <GearIcon className="w-5 h-5 text-white/60" />
          </button>
        </div>
      </aside>

      {/* ──────────────────────────────────────────────────────────
          MAIN WORKSPACE VIEWPORT (100% Height, No Top Header)
          ────────────────────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 h-full overflow-hidden bg-[var(--bg-app,rgb(9,9,11))]">
        {activeTab === 'image' && <ImageStudio apiKey={null} />}
        {activeTab === 'video' && <VideoStudio apiKey={null} />}
        {activeTab === 'lipsync' && <LipSyncStudio apiKey={null} />}
        {activeTab === 'cinema' && <CinemaStudio apiKey={null} />}
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <section role="dialog" aria-modal="true" aria-labelledby="local-settings-title" className="bg-[#14141a] rounded-3xl p-7 w-full max-w-md shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[var(--color-accent-subtle)] flex items-center justify-center text-[var(--color-accent)]">
                  <FingerprintLogoIcon className="w-5 h-5 text-white/90" />
                </div>
                <h2 id="local-settings-title" className="text-white font-bold text-lg">Local AI Studio</h2>
              </div>
              <button onClick={() => setShowSettings(false)} className="text-white/40 hover:text-white p-1 text-sm">✕</button>
            </div>
            <p className="text-white/70 text-xs leading-relaxed">
              Running 100% locally on your machine with zero cloud requests. Model execution is connected directly to your local Wan2GP instance.
            </p>
            <div className="bg-[#1c1c24] p-3 rounded-2xl flex flex-col gap-1.5 text-xs">
              <div className="flex justify-between text-white/80">
                <span className="text-white/50">Primary Model</span>
                <span className="font-semibold text-white/90">MiniMax H3 Ref2VA</span>
              </div>
              <div className="flex justify-between text-white/80">
                <span className="text-white/50">Local Port</span>
                <span className="font-mono text-white/60">127.0.0.1:3000</span>
              </div>
              <div className="flex justify-between text-white/80">
                <span className="text-white/50">Engine Host</span>
                <span className="font-mono text-white/60">127.0.0.1:42003</span>
              </div>
            </div>
            <button autoFocus onClick={() => setShowSettings(false)} className="w-full py-2.5 rounded-xl bg-[var(--color-accent)] text-white font-semibold text-xs hover:opacity-90 transition-all duration-200 shadow-md">
              Done
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
