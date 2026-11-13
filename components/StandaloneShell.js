'use client';

import { useState } from 'react';
import { ImageStudio, VideoStudio, LipSyncStudio, CinemaStudio } from 'studio';

const TABS = [
  { id: 'image', label: 'Image Studio' },
  { id: 'video', label: 'Video Studio' },
  { id: 'lipsync', label: 'Lip Sync' },
  { id: 'cinema', label: 'Cinema Studio' },
];

export default function StandaloneShell() {
  const [activeTab, setActiveTab] = useState('image');
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="h-screen bg-[#050505] flex flex-col overflow-hidden">
      <header className="flex-shrink-0 flex flex-wrap items-center justify-between gap-3 px-4 pt-4 border-b border-white/5">
        <span className="text-white font-black text-lg tracking-wider uppercase">
          Open Higgsfield AI
        </span>
        <nav aria-label="Studios" className="flex flex-wrap items-center gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              aria-pressed={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === tab.id ? 'bg-[#d9ff00] text-black' : 'text-white/50 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <button
          onClick={() => setShowSettings(true)}
          className="text-white/60 hover:text-white text-sm pb-2"
        >
          Settings
        </button>
      </header>

      <div role="status" className="flex-shrink-0 px-4 py-3 border-b border-white/10 bg-[#111] text-sm text-white/70">
        <strong className="text-[#d9ff00]">Local preview</strong>
        {' — Explore the studios without an API key. Local models are not connected yet; uploads and generation are disabled.'}
      </div>

      <main className="flex-1 min-h-0 overflow-y-auto">
        {activeTab === 'image' && <ImageStudio apiKey={null} />}
        {activeTab === 'video' && <VideoStudio apiKey={null} />}
        {activeTab === 'lipsync' && <LipSyncStudio apiKey={null} />}
        {activeTab === 'cinema' && <CinemaStudio apiKey={null} />}
      </main>

      {showSettings && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="local-settings-title" className="bg-[#111] border border-white/10 rounded-2xl p-8 w-full max-w-md">
            <h2 id="local-settings-title" className="text-white font-bold text-xl mb-4">Local setup</h2>
            <p className="text-white/70 text-sm mb-4">No paid API key is required. Cloud uploads and generation are disabled.</p>
            <p className="text-white/50 text-sm mb-6">The model menus currently show the original app's catalog. Connecting your installed Pinokio models and LoRAs is the next phase.</p>
            <button autoFocus onClick={() => setShowSettings(false)} className="w-full py-2 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20">
              Close
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
