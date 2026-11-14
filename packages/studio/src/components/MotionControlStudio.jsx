'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import VideoWorkflowTabs from './VideoWorkflowTabs.jsx';
import GenerationHistory from './GenerationHistory.jsx';
import CustomSelect from './CustomSelect.jsx';
import { compileH3Prompt } from '../h3Compiler.js';
import {
  ImageIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  RotateCwIcon,
  RotateCcwIcon,
  ZoomInIcon,
  ZoomOutIcon,
  CompassIcon,
  SparkleIcon,
  RefreshIcon,
  TrashIcon,
  FilmFrameIcon
} from './icons.jsx';

const MOTION_PRESETS = [
  { id: 'pan_left', label: 'Pan Left', category: 'pan', instruction: 'The camera executes a smooth horizontal pan to the left with realistic physical parallax and stable horizon.' },
  { id: 'pan_right', label: 'Pan Right', category: 'pan', instruction: 'The camera executes a smooth horizontal pan to the right with realistic physical parallax and stable horizon.' },
  { id: 'tilt_up', label: 'Tilt Up', category: 'tilt', instruction: 'The camera executes a smooth vertical tilt upward revealing the upper atmosphere and environment.' },
  { id: 'tilt_down', label: 'Tilt Down', category: 'tilt', instruction: 'The camera executes a smooth vertical tilt downward following natural downward perspective.' },
  { id: 'zoom_in', label: 'Zoom In / Push In', category: 'zoom', instruction: 'The camera performs a slow, cinematic push-in toward the subject, maintaining crisp focus and soft natural depth of field.' },
  { id: 'zoom_out', label: 'Zoom Out / Pull Out', category: 'zoom', instruction: 'The camera performs a cinematic pull-out expanding backward to reveal the wider surroundings.' },
  { id: 'orbit_left', label: 'Orbit Left', category: 'orbit', instruction: 'The camera executes a controlled semicircular orbit around the focal subject to the left, revealing background perspective smoothly.' },
  { id: 'orbit_right', label: 'Orbit Right', category: 'orbit', instruction: 'The camera executes a controlled semicircular orbit around the focal subject to the right, revealing background perspective smoothly.' },
  { id: 'crane_up', label: 'Crane Up', category: 'crane', instruction: 'The camera cranes upward smoothly while tilting down slightly to maintain subject framing.' },
  { id: 'crane_down', label: 'Crane Down', category: 'crane', instruction: 'The camera cranes downward smoothly toward the ground level.' },
  { id: 'roll_cw', label: 'Roll CW', category: 'roll', instruction: 'The camera performs a dynamic dutch-angle roll rotating clockwise.' },
  { id: 'roll_ccw', label: 'Roll CCW', category: 'roll', instruction: 'The camera performs a dynamic dutch-angle roll rotating counter-clockwise.' },
  { id: 'handheld', label: 'Organic Handheld', category: 'dynamic', instruction: 'The camera moves with subtle organic handheld motion, adding documentary realism and natural micro-movements.' },
  { id: 'drone', label: 'Drone Sweep', category: 'dynamic', instruction: 'An expansive aerial drone sweep glides smoothly forward with cinematic horizon curvature and natural lighting.' },
  { id: 'static', label: 'Static Lock', category: 'static', instruction: 'The camera remains firmly locked on a tripod with rock-solid stability while natural internal scene physics evolve.' },
];

export default function MotionControlStudio({ onNavigate, blocked = false }) {
  const [sourceImage, setSourceImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedMotion, setSelectedMotion] = useState('zoom_in');
  const [motionSpeed, setMotionSpeed] = useState(5);
  const [motionPrompt, setMotionPrompt] = useState('');
  const [duration, setDuration] = useState('5s');
  const [aspectRatio, setAspectRatio] = useState('Auto');
  const [quality, setQuality] = useState('720p');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [refreshHistory, setRefreshHistory] = useState(0);

  const fileInputRef = useRef(null);

  // Restore persisted state from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('openhiggs_motion_studio_state_v1');
      if (!raw) return;
      const s = JSON.parse(raw);
      if (s.sourceImage) setSourceImage(s.sourceImage);
      if (s.selectedMotion) setSelectedMotion(s.selectedMotion);
      if (typeof s.motionSpeed === 'number') setMotionSpeed(s.motionSpeed);
      if (typeof s.motionPrompt === 'string') setMotionPrompt(s.motionPrompt);
      if (s.duration) setDuration(s.duration);
      if (s.aspectRatio) setAspectRatio(s.aspectRatio);
      if (s.quality) setQuality(s.quality);
    } catch (e) {
      console.error('Failed to restore motion studio state:', e);
    }
  }, []);

  // Persist state to localStorage on any change
  useEffect(() => {
    try {
      localStorage.setItem('openhiggs_motion_studio_state_v1', JSON.stringify({
        sourceImage,
        selectedMotion,
        motionSpeed,
        motionPrompt,
        duration,
        aspectRatio,
        quality
      }));
    } catch {}
  }, [sourceImage, selectedMotion, motionSpeed, motionPrompt, duration, aspectRatio, quality]);

  // Upload handler
  const handleUploadImage = async (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    setIsUploading(true);
    setGenerateError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || 'Upload failed');
      setSourceImage({
        id: `img_${Date.now()}`,
        name: file.name,
        url: data.data.url,
        tag: '@image1',
        role: 'keyframe_start'
      });
    } catch (err) {
      setGenerateError(err.message || 'Image upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  // Compile prompt for H3
  const getCompiledPrompt = useCallback(() => {
    const activePreset = MOTION_PRESETS.find(m => m.id === selectedMotion) || MOTION_PRESETS[4];
    
    // Speed descriptor
    let speedDesc = '';
    if (motionSpeed <= 3) speedDesc = 'at a gentle, subtle pace';
    else if (motionSpeed <= 7) speedDesc = 'at a smooth, cinematic cadence';
    else speedDesc = 'with dynamic, high-momentum trajectory';

    const fullCameraInstruction = `${activePreset.instruction} (Motion speed: ${motionSpeed}/10, ${speedDesc}).`;

    const references = sourceImage ? [sourceImage] : [];
    const secDuration = duration === '10s' ? 10 : 5;

    return compileH3Prompt({
      userPrompt: motionPrompt ? `${motionPrompt}. ${fullCameraInstruction}` : fullCameraInstruction,
      references,
      duration: secDuration,
      preset: selectedMotion,
      cameraMotion: fullCameraInstruction,
    });
  }, [sourceImage, selectedMotion, motionSpeed, motionPrompt, duration]);

  // Submit Generation
  const handleGenerate = async () => {
    if (!sourceImage) {
      setGenerateError('Please upload a source image to apply motion control.');
      return;
    }
    setGenerateError('');
    setStatusMessage('Initiating motion synthesis...');
    setIsGenerating(true);
    setRefreshHistory(prev => prev + 1);

    try {
      const compiled = getCompiledPrompt();
      const secDuration = duration === '10s' ? 10 : 5;

      const payload = {
        prompt: motionPrompt || `Camera motion: ${selectedMotion}`,
        compiledPrompt: compiled,
        references: [sourceImage],
        duration: secDuration,
        aspectRatio,
        quality,
        preset: selectedMotion,
      };

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Motion generation request failed.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const block of lines) {
          if (!block.startsWith('data: ')) continue;
          const data = JSON.parse(block.slice(6));
          if (data.type === 'progress') {
            setStatusMessage(`${data.phase || 'Denoising'} (${data.pct || 0}%)`);
          } else if (data.type === 'done') {
            setStatusMessage('Motion video generated!');
            setRefreshHistory(prev => prev + 1);
          } else if (data.type === 'error') {
            throw new Error(data.message || 'Generation failed.');
          }
        }
      }
    } catch (err) {
      setGenerateError(err.message || 'Motion generation failed.');
      setStatusMessage('');
    } finally {
      setIsGenerating(false);
      setRefreshHistory(prev => prev + 1);
    }
  };

  const activePreset = MOTION_PRESETS.find(m => m.id === selectedMotion) || MOTION_PRESETS[4];

  return (
    <div className="flex h-full min-h-0 bg-[var(--bg-app,rgb(9,9,11))] text-white select-none">
      {/* ──────────────────────────────────────────────────────────
          LEFT SIDEBAR: MOTION CONTROL SETTINGS
          ────────────────────────────────────────────────────────── */}
      <aside className="studio-sidebar shrink-0 overflow-y-auto custom-scrollbar bg-[var(--bg-panel,rgb(9,9,11))] shadow-2xl flex flex-col">
        {/* Workflow Switcher */}
        <VideoWorkflowTabs active="motion" onChange={onNavigate} />

        <div className="p-4 flex flex-col gap-4 flex-1">
          {/* Header Description */}
          <div>
            <h1 className="text-sm font-bold text-white flex items-center gap-2">
              <CompassIcon className="w-4 h-4 text-white/70" />
              <span>Camera Motion Control</span>
            </h1>
            <p className="text-[11px] text-white/40 mt-0.5">
              Animate a still image with precise camera trajectory & velocity
            </p>
          </div>

          {/* 1. Source Image Slot */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold text-white/70 uppercase tracking-wider">
              Source Image
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handleUploadImage(e.target.files[0]);
                e.target.value = '';
              }}
            />

            {sourceImage ? (
              <div className="relative group rounded-xl overflow-hidden aspect-[16/10] bg-black/60 shadow-inner">
                <img
                  src={sourceImage.url}
                  alt="Source"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Replace Image"
                    className="w-8 h-8 rounded-lg bg-white/20 hover:bg-[var(--color-accent)] text-white flex items-center justify-center transition-all"
                  >
                    <RefreshIcon className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSourceImage(null)}
                    title="Remove Image"
                    className="w-8 h-8 rounded-lg bg-white/20 hover:bg-red-500 text-white flex items-center justify-center transition-all"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
                <div className="absolute bottom-1.5 left-1.5 pointer-events-none">
                  <span className="text-[9px] font-mono font-bold bg-black/80 px-1.5 py-0.5 rounded text-white/80">
                    {sourceImage.name}
                  </span>
                </div>
              </div>
            ) : (
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  if (e.dataTransfer.files?.[0]) handleUploadImage(e.dataTransfer.files[0]);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`upload-dropzone rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer aspect-[16/9] transition-all ${
                  isDragOver ? 'upload-dropzone-active' : ''
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-white/70 mb-1">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-white block">
                  {isUploading ? 'Uploading...' : 'Upload Image'}
                </span>
                <span className="text-[10px] text-white/40 block mt-0.5">
                  Drop image here, click to browse, or paste
                </span>
              </div>
            )}
          </div>

          {/* 2. Motion Direction Compass & Selection */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-white/70 uppercase tracking-wider">
                Camera Direction
              </span>
              <span className="text-[10px] font-mono text-white/50">
                {activePreset.label}
              </span>
            </div>

            {/* Directional Pad (Pan / Tilt / Zoom) */}
            <div className="bg-[var(--bg-card,#14141a)] p-3 rounded-xl flex flex-col items-center gap-1.5">
              {/* Up */}
              <button
                type="button"
                onClick={() => setSelectedMotion('tilt_up')}
                className={`w-9 h-8 rounded-lg flex items-center justify-center transition-all ${
                  selectedMotion === 'tilt_up'
                    ? 'bg-[var(--color-accent)] text-white shadow-md'
                    : 'bg-white/5 text-white/70 hover:bg-white/10'
                }`}
                title="Tilt Up"
              >
                <ArrowUpIcon className="w-4 h-4" />
              </button>

              {/* Left / Center (Zoom) / Right */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedMotion('pan_left')}
                  className={`w-9 h-8 rounded-lg flex items-center justify-center transition-all ${
                    selectedMotion === 'pan_left'
                      ? 'bg-[var(--color-accent)] text-white shadow-md'
                      : 'bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                  title="Pan Left"
                >
                  <ArrowLeftIcon className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMotion('zoom_in')}
                  className={`w-12 h-8 rounded-lg flex items-center justify-center gap-1 transition-all ${
                    selectedMotion === 'zoom_in'
                      ? 'bg-[var(--color-accent)] text-white shadow-md'
                      : 'bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                  title="Zoom In (Push In)"
                >
                  <ZoomInIcon className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMotion('pan_right')}
                  className={`w-9 h-8 rounded-lg flex items-center justify-center transition-all ${
                    selectedMotion === 'pan_right'
                      ? 'bg-[var(--color-accent)] text-white shadow-md'
                      : 'bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                  title="Pan Right"
                >
                  <ArrowRightIcon className="w-4 h-4" />
                </button>
              </div>

              {/* Down */}
              <button
                type="button"
                onClick={() => setSelectedMotion('tilt_down')}
                className={`w-9 h-8 rounded-lg flex items-center justify-center transition-all ${
                  selectedMotion === 'tilt_down'
                    ? 'bg-[var(--color-accent)] text-white shadow-md'
                    : 'bg-white/5 text-white/70 hover:bg-white/10'
                }`}
                title="Tilt Down"
              >
                <ArrowDownIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Cinematic Presets Grid */}
            <div className="grid grid-cols-3 gap-1 bg-[var(--bg-card,#14141a)] p-1.5 rounded-xl">
              {[
                { id: 'zoom_out', label: 'Zoom Out', icon: <ZoomOutIcon className="w-3.5 h-3.5" /> },
                { id: 'orbit_left', label: 'Orbit L', icon: <RotateCcwIcon className="w-3.5 h-3.5" /> },
                { id: 'orbit_right', label: 'Orbit R', icon: <RotateCwIcon className="w-3.5 h-3.5" /> },
                { id: 'crane_up', label: 'Crane Up', icon: <ArrowUpIcon className="w-3.5 h-3.5" /> },
                { id: 'crane_down', label: 'Crane Down', icon: <ArrowDownIcon className="w-3.5 h-3.5" /> },
                { id: 'handheld', label: 'Handheld', icon: <FilmFrameIcon className="w-3.5 h-3.5" /> },
                { id: 'drone', label: 'Drone', icon: <SparkleIcon className="w-3.5 h-3.5" /> },
                { id: 'roll_cw', label: 'Roll CW', icon: <RotateCwIcon className="w-3.5 h-3.5" /> },
                { id: 'static', label: 'Static Lock', icon: <CompassIcon className="w-3.5 h-3.5" /> },
              ].map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMotion(m.id)}
                  className={`py-1.5 px-2 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1 transition-all ${
                    selectedMotion === m.id
                      ? 'bg-[var(--color-accent)] text-white shadow-sm'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {m.icon}
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Motion Speed / Velocity Slider */}
          <div className="bg-[var(--bg-card,#14141a)] p-3 rounded-xl flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-white/70">Motion Velocity</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-white/80">
                {motionSpeed <= 3 ? 'Gentle' : motionSpeed <= 7 ? 'Cinematic' : 'Dynamic'} ({motionSpeed}/10)
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={motionSpeed}
              onChange={(e) => setMotionSpeed(Number(e.target.value))}
              className="w-full accent-[var(--color-accent)] cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-white/30 font-mono">
              <span>1 (Subtle)</span>
              <span>5 (Standard)</span>
              <span>10 (High Speed)</span>
            </div>
          </div>

          {/* 4. Motion Guidance / Scene Prompt */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider">
              Subject Movement Prompt
            </label>
            <textarea
              rows="3"
              value={motionPrompt}
              onChange={(e) => setMotionPrompt(e.target.value)}
              placeholder="Describe character actions or scene details (e.g. hair fluttering in the wind, dramatic lighting, smiling gently)..."
              className="w-full rounded-xl bg-[var(--bg-card,#14141a)] p-2.5 text-xs text-white placeholder-white/30 outline-none focus:ring-1 focus:ring-[var(--color-accent)] resize-none"
            />
          </div>

          {/* 5. Format Selectors */}
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-white/50">Duration</label>
              <CustomSelect
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                options={['5s', '10s']}
                size="sm"
                className="!bg-[var(--bg-card,#14141a)] !rounded-lg"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-white/50">Ratio</label>
              <CustomSelect
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                options={['Auto', '16:9', '9:16', '1:1']}
                size="sm"
                className="!bg-[var(--bg-card,#14141a)] !rounded-lg"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-white/50">Quality</label>
              <CustomSelect
                value={quality}
                onChange={(e) => setQuality(e.target.value)}
                options={['480p', '720p', '1080p']}
                size="sm"
                className="!bg-[var(--bg-card,#14141a)] !rounded-lg"
              />
            </div>
          </div>

          {/* Error & Status feedback */}
          {generateError && (
            <p className="text-xs text-red-400 bg-red-500/10 p-2.5 rounded-lg border border-red-500/20">
              {generateError}
            </p>
          )}
          {statusMessage && (
            <p className="text-xs text-white/70 bg-white/5 p-2 rounded-lg">
              {statusMessage}
            </p>
          )}

          {/* 6. Generate Action Button */}
          <button
            type="button"
            disabled={isGenerating || blocked || !sourceImage}
            onClick={handleGenerate}
            className="w-full mt-auto py-3 rounded-xl bg-[var(--color-accent)] hover:opacity-90 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isGenerating ? 'Synthesizing Motion...' : 'Generate Motion Video'}
          </button>
        </div>
      </aside>

      {/* ──────────────────────────────────────────────────────────
          RIGHT VIEWPORT: GENERATION HISTORY
          ────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 h-full overflow-hidden bg-[var(--bg-app,rgb(9,9,11))]">
        <GenerationHistory
          refreshKey={refreshHistory}
          disabled={isGenerating}
          onReuse={(item) => {
            if (item.prompt) setMotionPrompt(item.prompt);
            if (item.references?.[0]) setSourceImage(item.references[0]);
          }}
        />
      </div>
    </div>
  );
}
