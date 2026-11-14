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
      <header className="flex-shrink-0 flex flex-wrap items-center justify-between gap-4 px-6 py-3.5 bg-[#0e0e13]/90 backdrop-blur-xl">
        {/* Logo & Branding */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600/15 flex items-center justify-center text-blue-500 shadow-sm transition-transform duration-300 hover:scale-105">
            <FingerprintLogoIcon className="w-5 h-5 text-blue-500" />
          </div>
          <div className="flex flex-col">
            <span className="text-white font-bold text-base tracking-tight leading-tight">
              Local AI Studio
            </span>
            <span className="text-[10px] text-blue-400/80 font-medium tracking-wide">
              MiniMax H3 & Wan2GP
            </span>
          </div>
        </div>

        {/* Navigation Tabs - Borderless Pill Switcher */}
        <nav aria-label="Studios" className="flex items-center gap-1.5 bg-[#14141a] p-1 rounded-2xl">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              aria-pressed={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25 scale-[1.02]'
                  : 'text-white/60 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Right Settings */}
        <button
          onClick={() => setShowSettings(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white/60 hover:text-white hover:bg-white/[0.08] text-xs font-medium transition-all duration-200"
        >
          <GearIcon className="w-4 h-4 text-white/50" />
          <span>Settings</span>
        </button>
      </header>

      {/* Status Sub-bar - Borderless */}
      <div role="status" className="flex-shrink-0 px-6 py-2 bg-[#121217] text-xs text-white/70 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <strong className="text-blue-400 font-semibold">Local Engine Active</strong>
          <span className="text-white/40">·</span>
          <span className="text-white/60 text-[11px]">Direct Wan2GP queue connection. Offline media in data\uploads.</span>
        </div>
        <span className="hidden sm:inline text-[11px] text-white/40 font-mono">127.0.0.1:3000</span>
      </div>

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
