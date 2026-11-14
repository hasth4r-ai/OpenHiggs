'use client';

import { useState } from 'react';
import { ImageStudio, VideoStudio, LipSyncStudio, CinemaStudio, FingerprintLogoIcon, GearIcon } from 'studio';

const TABS = [
  { id: 'video', label: 'Video Studio' },
  { id: 'image', label: 'Image Studio' },
  { id: 'lipsync', label: 'Audio / LipSync' },
  { id: 'cinema', label: 'Cinema Studio' },
];

export default function StandaloneShell() {
  const [activeTab, setActiveTab] = useState('video');
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="h-screen bg-[#09090b] flex flex-col overflow-hidden text-white">
      {/* Top Header - Borderless, clean dark surface with subtle elevation */}
      {/* Top Header - Compact single-row layout saving vertical space */}
      <header className="flex-shrink-0 h-14 px-6 bg-[var(--bg-header,#0d0d12)] flex items-center justify-between gap-4 z-20 border-b border-white/[0.04]">
        {/* Logo & Branding */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[var(--color-accent-subtle)] flex items-center justify-center text-[var(--color-accent)] shadow-sm">
            <FingerprintLogoIcon className="w-5 h-5 text-white/90" />
          </div>
          <div className="flex flex-col">
            <span className="text-white font-bold text-sm tracking-tight leading-tight">
              Local AI Studio
            </span>
            <span className="text-[10px] text-white/50 font-medium tracking-wide">
              MiniMax H3 & Wan2GP
            </span>
          </div>
        </div>

        {/* Navigation Tabs - Borderless Pill Switcher */}
        <nav aria-label="Studios" className="flex items-center gap-1 bg-[#14141a] p-1 rounded-2xl">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              aria-pressed={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-[var(--color-accent)] text-white shadow-md'
                  : 'text-white/60 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Right Section: Engine Status & Settings */}
        <div className="flex items-center gap-3">
          <div role="status" className="hidden lg:flex items-center gap-2 bg-[#14141a] px-3 py-1.5 rounded-xl text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-white/80 font-semibold text-[11px]">Local Engine Active</span>
            <span className="text-white/30 text-[10px]">·</span>
            <span className="text-white/50 text-[10px] font-mono">Wan2GP & H3</span>
            <span className="text-white/30 text-[10px]">·</span>
            <span className="text-white/40 text-[10px] font-mono">127.0.0.1:3000</span>
          </div>

          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white/60 hover:text-white hover:bg-white/[0.08] text-xs font-medium transition-all duration-200"
          >
            <GearIcon className="w-4 h-4 text-white/50" />
            <span>Settings</span>
          </button>
        </div>
      </header>

      {/* Main Studio Viewport */}
      <main className="flex-1 min-h-0 h-full flex flex-col overflow-hidden bg-[#09090b]">
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
                <div className="w-8 h-8 rounded-xl bg-blue-600/15 flex items-center justify-center text-blue-500">
                  <FingerprintLogoIcon className="w-5 h-5" />
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
                <span className="font-semibold text-blue-400">MiniMax H3 Ref2VA</span>
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
            <button autoFocus onClick={() => setShowSettings(false)} className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-xs hover:bg-blue-500 transition-all duration-200 shadow-lg shadow-blue-600/25">
              Done
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
