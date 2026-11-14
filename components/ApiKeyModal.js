'use client';

import { useState } from 'react';
import { FingerprintLogoIcon } from '@/packages/studio/src/components/icons';

export default function ApiKeyModal({ onSave }) {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = key.trim();
    if (!trimmed) { setError('Please enter your API key'); return; }
    onSave(trimmed);
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-[#111115] shadow-2xl rounded-3xl p-8">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 bg-[var(--color-accent-subtle)] rounded-2xl flex items-center justify-center mb-4">
            <FingerprintLogoIcon className="w-9 h-9 text-white/90" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-wider mb-2">
            Local AI Studio
          </h1>
          <p className="text-white/40 text-sm">
            Enter your <a href="https://muapi.ai" target="_blank" rel="noreferrer" className="text-white/80 hover:underline">Muapi.ai</a> API key to start generating
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">
              Muapi API Key
            </label>
            <input
              type="password"
              value={key}
              onChange={(e) => { setKey(e.target.value); setError(''); }}
              placeholder="Enter your API key..."
              className="w-full bg-[#18181f] rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] transition-all"
              suppressHydrationWarning
            />
            {error && <p className="mt-1 text-red-400 text-xs">{error}</p>}
          </div>

          <button
            type="submit"
            className="w-full bg-[var(--color-accent)] hover:opacity-90 text-white font-bold py-3 rounded-xl transition-all shadow-md"
            suppressHydrationWarning
          >
            Launch Studio
          </button>

          <p className="text-center text-xs text-white/30">
            Don&apos;t have a key?{' '}
            <a href="https://muapi.ai" target="_blank" rel="noreferrer" className="text-white/80 hover:underline">
              Get one free at Muapi.ai →
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
