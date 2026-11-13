"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { generateVideo, generateI2V, uploadFile, LOCAL_ENGINE_CONNECTED, LOCAL_UPLOADS_ENABLED } from '../local.js';
import GenerationHistory from './GenerationHistory.jsx';
import { compileH3Prompt } from '../h3Compiler.js';
import { 
  ImageIcon, VideoCameraIcon, MicrophoneIcon, SparkleIcon, EditPencilIcon,
  LayersIcon, FilmFrameIcon, HistoryClockIcon, BookInfoIcon, TrackingIcon,
  ZoomInIcon, OrbitIcon, DroneIcon, ClapperboardIcon, DownloadIcon, CloseIcon
} from './icons.jsx';

// Camera & VFX Presets for MiniMax H3
const CAMERA_PRESETS = [
  {
    id: 'general',
    name: 'GENERAL',
    subtitle: 'MiniMax H3',
    description: 'Manual creative control with natural references & prompts.',
    icon: <ClapperboardIcon className="w-5 h-5 text-[#d9ff00]" />,
  },
  {
    id: 'tracking',
    name: 'TRACKING',
    subtitle: 'Camera Move',
    description: 'Smooth low-angle tracking shot following the subject.',
    icon: <TrackingIcon className="w-5 h-5 text-[#d9ff00]" />,
  },
  {
    id: 'push_in',
    name: 'PUSH IN',
    subtitle: 'Dramatic Focus',
    description: 'Slow, cinematic zoom in toward the character.',
    icon: <ZoomInIcon className="w-5 h-5 text-[#d9ff00]" />,
  },
  {
    id: 'orbit',
    name: 'ORBIT',
    subtitle: '360° Arc',
    description: 'Controlled semicircular camera orbit around the focal point.',
    icon: <OrbitIcon className="w-5 h-5 text-[#d9ff00]" />,
  },
  {
    id: 'drone',
    name: 'DRONE / AERIAL',
    subtitle: 'Landscape Sweep',
    description: 'Expansive forward gliding sweep across the environment.',
    icon: <DroneIcon className="w-5 h-5 text-[#d9ff00]" />,
  },
];

export default function VideoStudio({ apiKey }) {
  // Navigation sub-tabs
  const [subTab, setSubTab] = useState('create'); // 'create' | 'edit' | 'motion'
  const [refMode, setRefMode] = useState('references'); // 'references' | 'frames'

  // Model & Presets
  const [activePreset, setActivePreset] = useState(CAMERA_PRESETS[0]);
  const [showPresetModal, setShowPresetModal] = useState(false);

  // References state (up to 9 images, 3 videos, 3 audio)
  const [references, setReferences] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);

  // Prompt & Parameters
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState('5s');
  const [aspectRatio, setAspectRatio] = useState('Auto');
  const [quality, setQuality] = useState('480p');

  // UI state
  const [showElementsMenu, setShowElementsMenu] = useState(false);
  const [showCompiledPrompt, setShowCompiledPrompt] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState('');
  const [historyVersion, setHistoryVersion] = useState(0);
  const [generationError, setGenerationError] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [remaining, setRemaining] = useState(null);
  useEffect(() => {
    if (!isGenerating) return;
    const started = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [isGenerating]);
  const formatTime = (seconds) => `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;

  // Refs
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const textareaRef = useRef(null);

  // Calculate reference counts
  const imageCount = references.filter(r => r.type === 'image').length;
  const videoCount = references.filter(r => r.type === 'video').length;
  const audioCount = references.filter(r => r.type === 'audio').length;

  // Add reference helper
  const addReferenceItem = (type, url, name) => {
    setReferences(prev => {
      const typeList = prev.filter(r => r.type === type);
      const nextIdx = typeList.length + 1;
      let tag = `@image${nextIdx}`;
      let defaultRole = 'character_identity';

      if (type === 'video') {
        tag = `@video${nextIdx}`;
        defaultRole = 'camera_motion';
      } else if (type === 'audio') {
        tag = `@audio${nextIdx}`;
        defaultRole = 'voice_reference';
      } else {
        if (nextIdx === 2) defaultRole = 'costume_style';
        else if (nextIdx === 3) defaultRole = 'environment';
      }

      return [
        ...prev,
        {
          id: Date.now().toString() + Math.random(),
          type,
          tag,
          name: name || `${type}_${nextIdx}`,
          url,
          role: defaultRole,
        },
      ];
    });
  };

  const updateReferenceRole = (id, newRole) => {
    setReferences(prev => prev.map(r => r.id === id ? { ...r, role: newRole } : r));
  };

  const removeReference = (id) => {
    setReferences(prev => {
      const next = prev.filter(r => r.id !== id);
      let i = 1, v = 1, a = 1;
      return next.map(r => {
        if (r.type === 'video') return { ...r, tag: `@video${v++}` };
        if (r.type === 'audio') return { ...r, tag: `@audio${a++}` };
        return { ...r, tag: `@image${i++}` };
      });
    });
  };

  const insertTagIntoPrompt = (tag) => {
    if (!textareaRef.current) return;
    const text = prompt || '';
    const start = textareaRef.current.selectionStart || text.length;
    const end = textareaRef.current.selectionEnd || text.length;
    const before = text.substring(0, start);
    const after = text.substring(end);
    const needsSpaceBefore = before.length > 0 && !before.endsWith(' ');
    const needsSpaceAfter = after.length > 0 && !after.startsWith(' ');
    const insertion = `${needsSpaceBefore ? ' ' : ''}${tag}${needsSpaceAfter ? ' ' : ' '}`;
    const newText = before + insertion + after;
    setPrompt(newText);
    setShowElementsMenu(false);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const pos = start + insertion.length;
        textareaRef.current.setSelectionRange(pos, pos);
      }
    }, 10);
  };

  // Upload handler for files
  const handleUploadFiles = async (files) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    setUploadProgress(0);

    try {
      for (const file of Array.from(files)) {
        let type = 'image';
        if (file.type.startsWith('video/')) type = 'video';
        else if (file.type.startsWith('audio/')) type = 'audio';

        // Limit checks
        if (type === 'image' && imageCount >= 9) {
          alert('Maximum 9 reference images reached.');
          continue;
        }
        if (type === 'video' && videoCount >= 3) {
          alert('Maximum 3 reference videos reached.');
          continue;
        }
        if (type === 'audio' && audioCount >= 3) {
          alert('Maximum 3 reference audio files reached.');
          continue;
        }

        const url = await uploadFile(apiKey, file, (pct) => setUploadProgress(pct));
        addReferenceItem(type, url, file.name);
      }
    } catch (err) {
      console.error('[Higgsfield Video Studio] Upload error:', err);
      alert(`Upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (imageInputRef.current) imageInputRef.current.value = '';
      if (videoInputRef.current) videoInputRef.current.value = '';
      if (audioInputRef.current) audioInputRef.current.value = '';
    }
  };

  // Clipboard paste listener (<kbd>Ctrl</kbd> + <kbd>V</kbd>)
  useEffect(() => {
    const handlePaste = (e) => {
      if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
        handleUploadFiles(e.clipboardData.files);
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [references]);

  // Compile H3 prompt live
  const compiledH3Prompt = compileH3Prompt({
    userPrompt: prompt,
    references,
    duration: parseInt(duration) || 5,
    preset: activePreset.id,
  });

  const handleGenerate = async () => {
    if (!prompt.trim() && references.length === 0) {
      alert('Please enter a prompt or attach reference images.');
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);
    setGenerationStatus('Connecting to Wan2GP engine...');
    setHistoryVersion(v => v + 1);
    setGenerationError('');
    setElapsed(0);
    setRemaining(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          compiledPrompt: compiledH3Prompt,
          references,
          duration: parseInt(duration) || 5,
          quality,
          preset: activePreset.id,
          aspectRatio,
        }),
      });

      if (!response.ok) {
        const detail = await response.json().catch(() => ({}));
        throw new Error(detail.error || `Generation request failed with status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let completed = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'progress') {
                const pct = Math.max(0, Math.min(100, Math.round(data.pct)));
                setGenerationProgress(pct);
                setGenerationStatus(`${data.phase || 'Rendering'}${data.total ? ` (${data.step}/${data.total})` : ''}`);
                setRemaining(Number.isFinite(data.eta) ? data.eta : null);
              } else if (data.type === 'start') {
                setGenerationStatus(data.message);
              } else if (data.type === 'done') {
                completed = true;
                setGenerationProgress(100);
                setHistoryVersion(v => v + 1);
                setGenerationStatus('Complete!');
              } else if (data.type === 'error') {
                throw new Error(data.message);
              }
          }
        }
      }
      if (!completed) throw new Error('Connection ended before generation completed. Check Wan2GP before retrying.');
    } catch (err) {
      console.error('[VideoStudio] Generation failed:', err);
      setGenerationError(err.message);
    } finally {
      setIsGenerating(false);
      setHistoryVersion(v => v + 1);
    }
  };

  return (
    <div className="h-full flex overflow-hidden bg-[#0a0a0a] text-white select-none">
      
      {/* ──────────────────────────────────────────────────────────────────────────
          LEFT SIDEBAR: HIGGSFIELD STUDIO CONTROLS
          ────────────────────────────────────────────────────────────────────────── */}
      <aside className="w-[370px] flex-shrink-0 bg-[#0e0e0e] border-r border-white/10 flex flex-col h-full overflow-y-auto custom-scrollbar">
        
        {/* Sub-tabs: Create Video | Edit Video | Motion Control */}
        <div className="flex items-center gap-1 p-3 border-b border-white/5 bg-[#121212]">
          {[
            { id: 'create', label: 'Create Video' },
            { id: 'edit', label: 'Edit Video' },
            { id: 'motion', label: 'Motion Control' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id)}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                subTab === tab.id
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-4 flex flex-col gap-4 flex-1">

          {/* Model / Preset Banner */}
          <div className="relative rounded-2xl bg-[#161616] border border-white/10 p-3.5 flex items-center justify-between group overflow-hidden">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#222] border border-white/10 flex items-center justify-center overflow-hidden shadow-inner">
                {activePreset.icon}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-black text-[#d9ff00] tracking-wider uppercase">
                  {activePreset.name}
                </span>
                <span className="text-[11px] text-white/60 font-medium">
                  {activePreset.subtitle}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowPresetModal(true)}
              className="text-xs font-semibold text-white/70 hover:text-white bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 border border-white/5 cursor-pointer"
            >
              <EditPencilIcon className="w-3.5 h-3.5 text-[#d9ff00]" />
              <span>Change</span>
            </button>
          </div>

          {/* Mode Selector: [References] vs [Frames] */}
          <div className="flex items-center bg-[#161616] p-1 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => setRefMode('references')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                refMode === 'references'
                  ? 'bg-[#242424] text-white shadow-sm'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <LayersIcon className="w-3.5 h-3.5 text-[#d9ff00]" />
              <span>References</span>
            </button>
            <button
              type="button"
              onClick={() => setRefMode('frames')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                refMode === 'frames'
                  ? 'bg-[#242424] text-white shadow-sm'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <FilmFrameIcon className="w-3.5 h-3.5 text-white/50" />
              <span>Frames</span>
            </button>
          </div>

          {/* Add References Dropzone Card */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'copy';
              setIsDragOver(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDragOver(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOver(false);
              handleUploadFiles(e.dataTransfer.files);
            }}
            className={`border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
              isDragOver
                ? 'border-[#d9ff00] bg-[#d9ff00]/10 ring-2 ring-[#d9ff00]/30'
                : 'border-white/15 hover:border-white/30 bg-[#141414]/80'
            }`}
            onClick={() => imageInputRef.current?.click()}
          >
            {/* Hidden File Inputs */}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleUploadFiles(e.target.files)}
            />
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              multiple
              className="hidden"
              onChange={(e) => handleUploadFiles(e.target.files)}
            />
            <input
              ref={audioInputRef}
              type="file"
              accept="audio/*"
              multiple
              className="hidden"
              onChange={(e) => handleUploadFiles(e.target.files)}
            />

            {/* Three Circular Icons: Image, Video, Audio */}
            <div className="flex items-center gap-2.5">
              <div 
                title="Add Image Reference"
                onClick={(e) => { e.stopPropagation(); imageInputRef.current?.click(); }}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-[#d9ff00] hover:text-black transition-all flex items-center justify-center text-white/80"
              >
                <ImageIcon className="w-4 h-4" />
              </div>
              <div 
                title="Add Video Reference"
                onClick={(e) => { e.stopPropagation(); videoInputRef.current?.click(); }}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-[#d9ff00] hover:text-black transition-all flex items-center justify-center text-white/80"
              >
                <VideoCameraIcon className="w-4 h-4" />
              </div>
              <div 
                title="Add Audio Reference"
                onClick={(e) => { e.stopPropagation(); audioInputRef.current?.click(); }}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-[#d9ff00] hover:text-black transition-all flex items-center justify-center text-white/80"
              >
                <MicrophoneIcon className="w-4 h-4" />
              </div>
            </div>

            <div className="text-center">
              <span className="text-xs font-bold text-white block">
                {isUploading ? `Uploading... ${uploadProgress}%` : 'Add references'}
              </span>
              <span className="text-[10px] text-white/50 block mt-0.5">
                Up to 9 images, 3 videos, and 3 audio files
              </span>
              <span className="text-[9px] text-[#d9ff00]/80 font-mono block mt-1">
                Drop files here or Paste from Clipboard (<kbd>Ctrl+V</kbd>)
              </span>
            </div>
          </div>

          {/* Reference Chips / Tray (When files exist) */}
          {references.length > 0 && (
            <div className="flex flex-col gap-2 bg-[#121212] p-2.5 rounded-2xl border border-white/10">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">
                  Attached Elements ({references.length})
                </span>
                <span className="text-[9px] text-white/40">
                  Img: {imageCount}/9 · Vid: {videoCount}/3 · Aud: {audioCount}/3
                </span>
              </div>
              <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                {references.map(ref => (
                  <div
                    key={ref.id}
                    className="flex items-center justify-between gap-2 bg-[#1a1a1a] p-1.5 rounded-xl border border-white/5 hover:border-white/15 transition-all"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-lg overflow-hidden bg-black/60 flex-shrink-0 border border-white/10 flex items-center justify-center">
                        {ref.type === 'video' ? (
                          <video src={ref.url} className="w-full h-full object-cover" muted />
                        ) : ref.type === 'audio' ? (
                          <MicrophoneIcon className="w-4 h-4 text-[#d9ff00]" />
                        ) : (
                          <img src={ref.url} alt="" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => insertTagIntoPrompt(ref.tag)}
                        title={`Click to insert ${ref.tag} into prompt`}
                        className="text-xs font-mono font-bold text-[#d9ff00] hover:underline flex-shrink-0"
                      >
                        {ref.tag}
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <select
                        value={ref.role}
                        onChange={(e) => updateReferenceRole(ref.id, e.target.value)}
                        className="bg-black/80 text-[10px] text-white/80 rounded-md px-1.5 py-0.5 border border-white/10 focus:outline-none focus:border-[#d9ff00]"
                      >
                        {ref.type === 'video' ? (
                          <>
                            <option value="camera_motion">Camera / Motion</option>
                            <option value="continuation">Continuation</option>
                            <option value="source_edit">Source Edit</option>
                          </>
                        ) : ref.type === 'audio' ? (
                          <>
                            <option value="voice_reference">Voice Reference</option>
                            <option value="soundtrack">Soundtrack / BGM</option>
                          </>
                        ) : (
                          <>
                            <option value="character_identity">Character / Face</option>
                            <option value="costume_style">Costume / Outfit</option>
                            <option value="environment">Environment / Style</option>
                            <option value="keyframe_start">Start Keyframe</option>
                            <option value="keyframe_end">End Keyframe</option>
                          </>
                        )}
                      </select>
                      <button
                        type="button"
                        onClick={() => removeReference(ref.id)}
                        className="text-white/40 hover:text-red-400 p-1 transition-colors"
                        title="Remove"
                      >
                        <CloseIcon className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Prompt Section */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white tracking-wide">
                Prompt
              </label>
              <button
                type="button"
                onClick={() => setShowCompiledPrompt(s => !s)}
                className="text-[10px] text-[#d9ff00] hover:underline font-mono"
              >
                {showCompiledPrompt ? 'Hide H3 Syntax ▲' : 'Inspect H3 Syntax ▼'}
              </button>
            </div>

            <div className="relative">
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                placeholder="Describe the video. Refer to inputs as Image 1, Video 1, or Audio 1. Add elements using @"
                className="w-full bg-[#141414] border border-white/10 rounded-2xl p-3 text-xs md:text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#d9ff00]/60 resize-none custom-scrollbar leading-relaxed"
              />

              {/* @ Elements Quick Button */}
              <div className="flex items-center justify-between mt-1 px-1">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowElementsMenu(s => !s)}
                    className="text-[11px] font-bold text-white/70 hover:text-white bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-lg border border-white/10 transition-all flex items-center gap-1"
                  >
                    <span>@ Elements</span>
                  </button>

                  {/* Elements Popover Menu */}
                  {showElementsMenu && (
                    <div className="absolute left-0 bottom-full mb-1 w-52 bg-[#181818] border border-white/15 rounded-xl p-2 shadow-2xl z-50 flex flex-col gap-1">
                      <span className="text-[9px] font-bold text-white/50 uppercase tracking-widest px-1 pb-1 border-b border-white/5">
                        Insert Reference Tag
                      </span>
                      {references.length === 0 ? (
                        <span className="text-[10px] text-white/40 p-2 text-center">
                          No references uploaded yet. Drop an image or video above!
                        </span>
                      ) : (
                        references.map(r => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => insertTagIntoPrompt(r.tag)}
                            className="flex items-center justify-between p-1.5 rounded-lg hover:bg-white/10 text-left text-xs transition-colors"
                          >
                            <span className="font-mono font-bold text-[#d9ff00]">{r.tag}</span>
                            <span className="text-[10px] text-white/60 truncate max-w-[100px]">{r.name}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <span className="text-[10px] text-white/40 font-mono">
                  {prompt.length} chars
                </span>
              </div>
            </div>

            {/* Compiled H3 Ref2VA Preview Drawer */}
            {showCompiledPrompt && (
              <div className="mt-2 bg-[#090909] border border-[#d9ff00]/30 rounded-xl p-2.5 flex flex-col gap-1 text-[10px] font-mono animate-fade-in">
                <div className="flex items-center justify-between text-[#d9ff00] font-bold pb-1 border-b border-white/10">
                  <span>Compiled MiniMax H3 Ref2VA</span>
                  <span className="text-[9px] text-white/40">Zero empty lines</span>
                </div>
                <div className="text-white/80 max-h-36 overflow-y-auto break-all custom-scrollbar whitespace-pre-wrap leading-relaxed">
                  {compiledH3Prompt || '// Add prompt text or references to preview compiled H3 syntax'}
                </div>
              </div>
            )}
          </div>

          {/* Parameters Grid */}
          <div className="flex flex-col gap-2.5 pt-2 border-t border-white/5">
            {/* Model Row */}
            <div className="flex items-center justify-between bg-[#141414] p-2.5 rounded-xl border border-white/10">
              <span className="text-xs font-bold text-white/60">Model</span>
              <span className="text-xs font-black text-[#d9ff00] flex items-center gap-1.5">
                <span>MiniMax H3</span>
                <SparkleIcon className="w-3.5 h-3.5 text-[#d9ff00]" />
              </span>
            </div>

            {/* Duration & Aspect Ratio */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1 bg-[#141414] p-2 rounded-xl border border-white/10">
                <span className="text-[10px] font-bold text-white/50 uppercase">Duration</span>
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
                >
                  <option value="5s" className="bg-[#141414]">5s</option>
                  <option value="10s" className="bg-[#141414]">10s</option>
                </select>
              </div>

              <div className="flex flex-col gap-1 bg-[#141414] p-2 rounded-xl border border-white/10">
                <span className="text-[10px] font-bold text-white/50 uppercase">Aspect Ratio</span>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
                >
                  <option value="Auto" className="bg-[#141414]">Auto</option>
                  <option value="16:9" className="bg-[#141414]">16:9 (Landscape)</option>
                  <option value="9:16" className="bg-[#141414]">9:16 (Portrait)</option>
                  <option value="1:1" className="bg-[#141414]">1:1 (Square)</option>
                </select>
              </div>
            </div>

            {/* Quality Row */}
            <div className="flex items-center justify-between bg-[#141414] p-2.5 rounded-xl border border-white/10">
              <span className="text-xs font-bold text-white/50 uppercase">Quality</span>
              <div className="flex items-center gap-1">
                {['480p', '720p', '1080p'].map(q => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setQuality(q)}
                    className={`px-2 py-0.5 text-[11px] font-bold rounded-md transition-all ${
                      quality === q
                        ? 'bg-[#d9ff00] text-black'
                        : 'text-white/60 hover:text-white bg-white/5'
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Big Lime-Green Generate Button */}
          <div className="mt-auto pt-3">
            <button
              type="button"
              disabled={isGenerating}
              onClick={handleGenerate}
              className="w-full bg-[#d9ff00] text-black font-black text-sm py-3.5 rounded-2xl hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <span className="animate-spin inline-block text-black">◌</span>
                  <span className="truncate max-w-[240px]">{generationStatus || 'Rendering...'}</span>
                </>
              ) : (
                <>
                  <span>Generate</span>
                  <SparkleIcon className="w-4 h-4 text-black" />
                  <span className="text-[10px] font-mono bg-black/15 px-2 py-0.5 rounded-full ml-1">
                    Local
                  </span>
                </>
              )}
            </button>
            {isGenerating && <p className="text-xs text-white/60 mt-2" aria-live="polite">Elapsed: {formatTime(elapsed)} · {remaining === null ? 'Estimating remaining time…' : `About ${formatTime(remaining)} left in this sampling pass`}</p>}
            {generationError && <p role="alert" className="text-xs text-red-400 mt-2 whitespace-normal">{generationError}</p>}
          </div>

        </div>
      </aside>

      <GenerationHistory refreshKey={historyVersion} disabled={isGenerating} onReuse={item => {
        setPrompt(item.prompt || '');
        if (Number(item.duration) > 0) setDuration((Number(item.duration) > 7.5 ? 10 : 5) + 's');
        if (['480p', '720p', '1080p'].includes(item.quality)) setQuality(item.quality);
        setReferences(item.references || []);
        setActivePreset(CAMERA_PRESETS.find(p => p.id === item.preset) || CAMERA_PRESETS[0]);
        if (item.aspectRatio) setAspectRatio(item.aspectRatio);
        textareaRef.current?.focus();
      }} />

      {/* Preset Modal */}
      {showPresetModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-white/15 rounded-3xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-black text-white uppercase tracking-wide">
                Select Camera Preset
              </h3>
              <button
                type="button"
                onClick={() => setShowPresetModal(false)}
                className="text-white/40 hover:text-white p-1"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2.5 max-h-80 overflow-y-auto custom-scrollbar">
              {CAMERA_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => {
                    setActivePreset(preset);
                    setShowPresetModal(false);
                  }}
                  className={`p-3 rounded-2xl border text-left flex items-center gap-3.5 transition-all ${
                    activePreset.id === preset.id
                      ? 'border-[#d9ff00] bg-[#d9ff00]/10 text-white'
                      : 'border-white/10 hover:border-white/30 bg-white/5 text-white/80'
                  }`}
                >
                  <div className="flex-shrink-0">{preset.icon}</div>
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-[#d9ff00]">{preset.name}</span>
                    <span className="text-[11px] text-white/60">{preset.description}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
