'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import CustomSelect from './CustomSelect.jsx';
import GenerationHistory from './GenerationHistory.jsx';
import { 
  SparkleIcon, 
  ImageIcon, 
  EditPencilIcon, 
  CloseIcon, 
  PlusIcon, 
  TrashIcon, 
  RefreshIcon,
  LayersIcon,
  UndoIcon
} from './icons.jsx';
import { generateImage, generateI2I, uploadFile, LOCAL_ENGINE_CONNECTED, LOCAL_UPLOADS_ENABLED } from '../local.js';
import { 
  t2iModels, 
  i2iModels, 
  getModelById, 
  getAspectRatiosForModel, 
  getResolutionsForModel 
} from '../models.js';

const QUICK_TAGS = [
  'Cinematic Lighting',
  'Photorealistic 8K',
  'Volumetric Mist',
  'Cyberpunk Neon',
  'Artisan Workshop',
  'Vintage Film 35mm',
  'Macro Detail',
  'Anime Studio Art',
  'Watercolor Wash'
];

function getModelIcon(model) {
  if (model?.icon) return model.icon;
  const id = (model?.id || '').toLowerCase();
  const name = (model?.name || '').toLowerCase();
  const family = (model?.family || '').toLowerCase();
  if (id.includes('minimax') || name.includes('minimax') || family === 'minimax') {
    return '/assets/models/minimax-color.png';
  }
  if (id.includes('wan') || name.includes('wan') || family === 'wan') {
    return '/assets/models/wan-logo.png';
  }
  return null;
}

export default function ImageStudio({ apiKey, initialSubTab = 'create', onSubTabChange }) {
  // Main tabs: 'create' (Create Image) | 'edit' (Edit Image)
  const normalizeTab = (tab) => (tab === 'edit' || tab === 'i2i') ? 'edit' : 'create';
  const [subTab, setSubTab] = useState(() => normalizeTab(initialSubTab));

  // Edit sub-modes: 'clean_plate' (Remove / Clean plate) | 'replace' (Replace Object / Face)
  const [editMode, setEditMode] = useState('clean_plate');

  // Active Model
  const [selectedModel, setSelectedModel] = useState(t2iModels[0]);
  const [showModelModal, setShowModelModal] = useState(false);
  const [modelSearch, setModelSearch] = useState('');

  // Prompt & Parameters for Create Image
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [resolution, setResolution] = useState('2048x2048 (4MP)');
  const [numSteps, setNumSteps] = useState('6');
  const [batchCount, setBatchCount] = useState(1);

  // References state (up to 16 reference images)
  const [references, setReferences] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);

  // Edit Image state (Clean Plate / Replace)
  const [editSource, setEditSource] = useState(null); // { url, name }
  const [editMask, setEditMask] = useState(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [editReference, setEditReference] = useState(null);
  const [brushSize, setBrushSize] = useState(36);
  const [isDrawing, setIsDrawing] = useState(false);
  const [maskHistory, setMaskHistory] = useState([]);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const [historyVersion, setHistoryVersion] = useState(0);

  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const editSourceInputRef = useRef(null);
  const editRefInputRef = useRef(null);
  const canvasRef = useRef(null);

  // Sync subTab prop from URL routing
  useEffect(() => {
    if (initialSubTab) {
      setSubTab(normalizeTab(initialSubTab));
    }
  }, [initialSubTab]);

  const handleSubTabChange = (newTab) => {
    const normalized = normalizeTab(newTab);
    setSubTab(normalized);
    onSubTabChange?.(normalized);
  };

  const addTag = (tag) => {
    setPrompt((prev) => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed}, ${tag}` : tag;
    });
    textareaRef.current?.focus();
  };

  // Upload handler for reference images
  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;
    const maxRefs = selectedModel?.maxImages || 16;
    if (references.length >= maxRefs) {
      alert(`This model supports up to ${maxRefs} reference images.`);
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    try {
      const newRefs = [...references];
      for (const file of Array.from(files)) {
        if (newRefs.length >= maxRefs) break;
        if (!file.type.startsWith('image/')) continue;
        
        const url = await uploadFile(apiKey, file, (pct) => setUploadProgress(pct));
        newRefs.push({
          id: Math.random().toString(36).substring(7),
          name: file.name,
          url,
          tag: `Image ${newRefs.length + 1}`
        });
      }
      setReferences(newRefs);
    } catch (err) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Upload handler for source image in Edit Image
  const handleEditSourceUpload = async (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    setIsUploading(true);
    try {
      const url = await uploadFile(apiKey, file);
      setEditSource({ url, name: file.name });
      setMaskHistory([]);
      setEditMask(null);
    } catch (err) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Upload handler for reference image in Replace mode
  const handleEditRefUpload = async (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    setIsUploading(true);
    try {
      const url = await uploadFile(apiKey, file);
      setEditReference({ url, name: file.name });
    } catch (err) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const removeReference = (index) => {
    setReferences((prev) => prev.filter((_, i) => i !== index));
  };

  // Canvas drawing handlers for Edit Image mask brush
  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    const ctx = canvas.getContext('2d');
    
    // Save history for undo
    setMaskHistory(prev => [...prev, ctx.getImageData(0, 0, canvas.width, canvas.height)]);

    ctx.strokeStyle = 'rgba(255, 40, 80, 0.75)';
    ctx.fillStyle = 'rgba(255, 40, 80, 0.75)';
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    const ctx = canvas.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Export binary mask
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = canvas.width;
    maskCanvas.height = canvas.height;
    const mctx = maskCanvas.getContext('2d');
    mctx.fillStyle = '#000000';
    mctx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
    mctx.drawImage(canvas, 0, 0);
    // Convert red strokes to white
    const imgData = mctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    for (let i = 0; i < imgData.data.length; i += 4) {
      if (imgData.data[i + 3] > 20 && imgData.data[i] > 100) {
        imgData.data[i] = 255;
        imgData.data[i + 1] = 255;
        imgData.data[i + 2] = 255;
        imgData.data[i + 3] = 255;
      } else {
        imgData.data[i] = 0;
        imgData.data[i + 1] = 0;
        imgData.data[i + 2] = 0;
        imgData.data[i + 3] = 255;
      }
    }
    mctx.putImageData(imgData, 0, 0);
    maskCanvas.toBlob(async (blob) => {
      if (blob) {
        const file = new File([blob], 'mask.png', { type: 'image/png' });
        const maskUrl = await uploadFile(apiKey, file);
        setEditMask(maskUrl);
      }
    });
  };

  const undoMask = () => {
    const canvas = canvasRef.current;
    if (!canvas || !maskHistory.length) return;
    const prev = maskHistory[maskHistory.length - 1];
    canvas.getContext('2d').putImageData(prev, 0, 0);
    setMaskHistory(h => h.slice(0, -1));
  };

  const clearMask = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    setMaskHistory([]);
    setEditMask(null);
  };

  const handleGenerate = async () => {
    if (isGenerating) return;

    if (subTab === 'create') {
      const textPrompt = prompt.trim();
      if (!textPrompt) {
        setGenerationError('Please enter a prompt.');
        textareaRef.current?.focus();
        return;
      }

      setIsGenerating(true);
      setGenerationError('');
      setHistoryVersion((v) => v + 1);

      try {
        const genParams = {
          prompt: textPrompt,
          model: selectedModel.id,
          aspect_ratio: aspectRatio,
          resolution: resolution,
          num_inference_steps: Number.parseInt(numSteps) || 6,
          batch_size: batchCount,
          image_urls: references.map(r => r.url)
        };

        await generateImage(apiKey, genParams);
        setHistoryVersion((v) => v + 1);
      } catch (err) {
        setGenerationError(err.message || 'Generation failed.');
      } finally {
        setIsGenerating(false);
        setHistoryVersion((v) => v + 1);
      }
    } else {
      // Edit Image Mode
      if (!editSource?.url) {
        setGenerationError('Please upload an image to edit.');
        return;
      }

      const activePrompt = editMode === 'clean_plate'
        ? (editPrompt.trim() || 'Clean plate, remove painted element, seamlessly restore natural background textures and lighting')
        : editPrompt.trim();

      if (editMode === 'replace' && !activePrompt && !editReference?.url) {
        setGenerationError('Please provide a replacement prompt or a reference image.');
        return;
      }

      setIsGenerating(true);
      setGenerationError('');
      setHistoryVersion((v) => v + 1);

      try {
        const genParams = {
          prompt: activePrompt,
          source: editSource.url,
          mask: editMask,
          reference: editReference?.url,
          model: selectedModel.id,
          resolution: resolution,
          batch_size: 1
        };

        await generateI2I(apiKey, genParams);
        setHistoryVersion((v) => v + 1);
      } catch (err) {
        setGenerationError(err.message || 'Edit operation failed.');
      } finally {
        setIsGenerating(false);
        setHistoryVersion((v) => v + 1);
      }
    }
  };

  const handleReuse = (item) => {
    if (item.prompt) setPrompt(item.prompt);
    if (item.aspectRatio) setAspectRatio(item.aspectRatio);
    if (item.resolution) setResolution(item.resolution);
    if (item.references && Array.isArray(item.references)) {
      setReferences(item.references);
    }
    textareaRef.current?.focus();
  };

  const availableArs = getAspectRatiosForModel(selectedModel.id);
  const availableResolutions = getResolutionsForModel(selectedModel.id);

  return (
    <div className="h-full flex overflow-hidden bg-[var(--bg-app,rgb(9,9,11))] text-white select-none">
      {/* ──────────────────────────────────────────────────────────────────────────
          LEFT SIDEBAR: STUDIO CONTROLS (Identical architecture to VideoStudio)
          ────────────────────────────────────────────────────────────────────────── */}
      <aside className="studio-sidebar flex-shrink-0 bg-[#111115] shadow-2xl flex flex-col h-full overflow-y-auto custom-scrollbar">
        {/* Top Workflow Navigation: Create Image | Edit Image */}
        <nav className="studio-workflow-tabs" aria-label="Image workflow">
          {[
            ['create', 'Create Image'],
            ['edit', 'Edit Image']
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={subTab === id}
              onClick={() => handleSubTabChange(id)}
              className={subTab === id ? 'active' : ''}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="p-4 flex flex-col gap-4 flex-1">
          {/* Model / Cover Banner Card */}
          <div
            className="relative rounded-2xl p-3.5 flex items-center justify-between group overflow-hidden transition-all duration-300 shadow-xl border border-white/10"
            style={{
              backgroundImage: `linear-gradient(to right, rgba(17, 17, 24, 0.95) 25%, rgba(17, 17, 24, 0.78) 65%, rgba(17, 17, 24, 0.45) 100%), url('${selectedModel.cover || '/assets/models/minimax-h3-image.jpg'}')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <div className="flex items-center gap-3 z-10">
              <div className="w-12 h-12 rounded-xl bg-black/50 backdrop-blur-md border border-white/15 flex items-center justify-center overflow-hidden shadow-inner p-1">
                <img
                  src={getModelIcon(selectedModel) || '/assets/models/minimax-color.png'}
                  alt={selectedModel.name}
                  className="w-8 h-8 object-contain"
                />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-white tracking-wider uppercase drop-shadow">
                    {selectedModel.name}
                  </span>
                </div>
                <span className="text-[11px] text-white/70 font-semibold drop-shadow">
                  {subTab === 'edit' ? 'Brush Inpaint & Face/Object Replacement' : 'Native 16MP · 6 Steps DiT'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowModelModal(true)}
              className="z-10 text-xs font-bold text-white bg-black/60 hover:bg-black/85 border border-white/20 backdrop-blur-md px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer interactive-hover shadow-md"
            >
              <EditPencilIcon className="w-3.5 h-3.5 text-white/90" />
              <span>Change</span>
            </button>
          </div>

          {/* ──────────────────────────────────────────────────────────────────
              WORKFLOW 1: CREATE IMAGE (Text-to-Image with References)
              ────────────────────────────────────────────────────────────────── */}
          {subTab === 'create' ? (
            <>
              {/* References Selector matching VideoStudio */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center bg-[#18181f] p-1 rounded-xl">
                  <button
                    type="button"
                    className="flex-1 py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 bg-[#282833] text-white shadow-sm"
                  >
                    <LayersIcon className="w-3.5 h-3.5 text-[var(--color-accent-text)]" />
                    <span>References</span>
                    {references.length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--color-accent)] text-white font-mono">
                        {references.length}
                      </span>
                    )}
                  </button>
                </div>

                {/* References Dropzone (matching VideoStudio style) */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setIsDragOver(false); handleFileUpload(e.dataTransfer.files); }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
                    isDragOver
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent-subtle)]'
                      : 'border-white/10 hover:border-white/25 bg-white/[0.01]'
                  }`}
                >
                  <div className="flex justify-center mb-2">
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/70">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="text-xs font-bold text-white mb-0.5">Add references</p>
                  <p className="text-[11px] text-white/45">Up to 16 images for style, character, or scene consistency</p>
                  <p className="text-[10px] text-white/30 mt-1">Drop files here or Paste from Clipboard (Ctrl+V)</p>
                </div>

                {/* Uploaded References Thumbnails */}
                {references.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {references.map((ref, idx) => (
                      <div key={ref.id || idx} className="relative group w-14 h-14 rounded-xl overflow-hidden bg-black/60 border border-white/10 shadow-md">
                        <img src={ref.url} alt={ref.name} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeReference(idx)}
                          title="Remove image"
                          className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-red-400"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files)}
                />
              </div>

              {/* Prompt Section */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="image-prompt" className="text-xs font-bold text-white/80">
                    Prompt
                  </label>
                  <span className="text-[10px] text-white/40 font-mono">
                    {prompt.length} chars
                  </span>
                </div>

                <textarea
                  id="image-prompt"
                  ref={textareaRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the image in rich detail. MiniMax H3 Image DiT natively excels with scene architecture, atmospheric lighting, and high-frequency textures..."
                  rows={4}
                  className="w-full bg-[#18181f] border border-white/5 focus:border-[var(--color-accent)] rounded-2xl p-3.5 text-xs text-white placeholder-white/30 focus:outline-none transition-all resize-none custom-scrollbar leading-relaxed"
                />

                {/* Quick Enhancer Tags */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {QUICK_TAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => addTag(tag)}
                      className="text-[10px] font-semibold text-white/60 hover:text-white bg-white/5 hover:bg-white/10 px-2 py-1 rounded-lg transition-all"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Parameters Grid (Redundant Model row removed) */}
              <div className="flex flex-col gap-2.5 pt-2">
                {/* Aspect Ratio & Resolution */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1 bg-[#18181f] p-2 rounded-xl border border-white/5">
                    <span className="text-[10px] font-bold text-white/50 uppercase">Aspect Ratio</span>
                    <CustomSelect
                      value={aspectRatio}
                      onChange={(e) => setAspectRatio(e.target.value)}
                      options={availableArs.length ? availableArs : ['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3', '21:9']}
                      className="!bg-transparent !border-0 !p-0 !text-xs !font-bold"
                    />
                  </div>

                  <div className="flex flex-col gap-1 bg-[#18181f] p-2 rounded-xl border border-white/5">
                    <span className="text-[10px] font-bold text-white/50 uppercase">Resolution</span>
                    <CustomSelect
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value)}
                      options={
                        availableResolutions.length
                          ? availableResolutions
                          : [
                              ['1024x1024 (1MP)', '1024x1024 (1MP)'],
                              ['2048x2048 (4MP)', '2048x2048 (4MP)'],
                              ['4096x4096 (16MP UHD)', '4096x4096 (16MP UHD)']
                            ]
                      }
                      className="!bg-transparent !border-0 !p-0 !text-xs !font-bold"
                    />
                  </div>
                </div>

                {/* Sampling Steps & Batch Count */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1 bg-[#18181f] p-2 rounded-xl border border-white/5">
                    <span className="text-[10px] font-bold text-white/50 uppercase">Sampling Steps</span>
                    <CustomSelect
                      value={numSteps}
                      onChange={(e) => setNumSteps(e.target.value)}
                      options={[
                        ['6', '6 Steps (Turbo)'],
                        ['8', '8 Steps'],
                        ['12', '12 Steps']
                      ]}
                      className="!bg-transparent !border-0 !p-0 !text-xs !font-bold"
                    />
                  </div>

                  <div className="flex flex-col gap-1 bg-[#18181f] p-2 rounded-xl border border-white/5">
                    <span className="text-[10px] font-bold text-white/50 uppercase">Images Batch</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      {[1, 2, 4].map((count) => (
                        <button
                          key={count}
                          type="button"
                          onClick={() => setBatchCount(count)}
                          className={`flex-1 py-1 rounded text-xs font-bold transition-all ${
                            batchCount === count
                              ? 'bg-[var(--color-accent)] text-white shadow-sm'
                              : 'bg-white/5 text-white/60 hover:text-white'
                          }`}
                        >
                          {count}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* ──────────────────────────────────────────────────────────────────
                WORKFLOW 2: EDIT IMAGE (Clean Plate / Remove & Replace Object/Face)
                ────────────────────────────────────────────────────────────────── */
            <div className="flex flex-col gap-4">
              {/* Edit Sub-Mode Selector */}
              <div className="flex items-center bg-[#18181f] p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setEditMode('clean_plate')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    editMode === 'clean_plate'
                      ? 'bg-[#282833] text-white shadow-sm'
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  Clean Plate / Remove
                </button>
                <button
                  type="button"
                  onClick={() => setEditMode('replace')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    editMode === 'replace'
                      ? 'bg-[#282833] text-white shadow-sm'
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  Replace Object / Face
                </button>
              </div>

              {/* Base Image Upload / Brush Canvas */}
              {!editSource ? (
                <div
                  onClick={() => editSourceInputRef.current?.click()}
                  className="rounded-2xl border-2 border-dashed border-white/10 hover:border-white/25 p-7 text-center cursor-pointer bg-white/[0.01] transition-all"
                >
                  <div className="flex justify-center mb-2">
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/70">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="text-xs font-bold text-white mb-0.5">Upload base image</p>
                  <p className="text-[11px] text-white/45">Select an image to paint over and edit</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-white/80">
                    <span>Paint Mask Area</span>
                    <div className="flex items-center gap-2">
                      <button 
                        type="button" 
                        onClick={undoMask} 
                        title="Undo stroke"
                        className="p-1 rounded bg-white/5 hover:bg-white/10 text-white/70 hover:text-white"
                      >
                        <UndoIcon className="w-3.5 h-3.5"/>
                      </button>
                      <button 
                        type="button" 
                        onClick={clearMask} 
                        className="text-[10px] text-red-400 hover:underline"
                      >
                        Clear
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setEditSource(null)} 
                        className="text-[10px] text-white/40 hover:text-white"
                      >
                        Change Image
                      </button>
                    </div>
                  </div>

                  {/* Interactive Mask Brush Canvas Overlay */}
                  <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-black/60 border border-white/10 flex items-center justify-center">
                    <img 
                      src={editSource.url} 
                      alt="Source" 
                      className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
                    />
                    <canvas
                      ref={canvasRef}
                      width={512}
                      height={512}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      className="absolute inset-0 w-full h-full object-contain cursor-crosshair z-10"
                    />
                  </div>

                  {/* Brush Size Slider */}
                  <div className="flex items-center justify-between bg-[#18181f] p-2 rounded-xl text-xs">
                    <span className="text-[10px] font-bold text-white/50 uppercase">Brush Size: {brushSize}px</span>
                    <input 
                      type="range" 
                      min="12" 
                      max="80" 
                      value={brushSize} 
                      onChange={(e) => setBrushSize(Number(e.target.value))}
                      className="w-32 accent-[var(--color-accent)]"
                    />
                  </div>
                </div>
              )}

              <input
                ref={editSourceInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleEditSourceUpload(e.target.files[0])}
              />

              {/* Mode-Specific Controls */}
              {editMode === 'replace' ? (
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-xs font-bold text-white/80 block mb-1">
                      Replacement Prompt
                    </label>
                    <textarea
                      value={editPrompt}
                      onChange={(e) => setEditPrompt(e.target.value)}
                      placeholder="Describe what to generate in the painted area (e.g. 'A sleek carbon-fiber spoiler', 'A smiling cyborg face', etc.)..."
                      rows={3}
                      className="w-full bg-[#18181f] border border-white/5 focus:border-[var(--color-accent)] rounded-2xl p-3 text-xs text-white placeholder-white/30 focus:outline-none transition-all resize-none"
                    />
                  </div>

                  {/* Optional Reference for Face / Object Transfer */}
                  <div>
                    <span className="text-xs font-bold text-white/80 block mb-1">
                      Identity / Style Reference (Optional)
                    </span>
                    {!editReference ? (
                      <div
                        onClick={() => editRefInputRef.current?.click()}
                        className="rounded-xl border border-dashed border-white/10 p-3 text-center cursor-pointer hover:border-white/20 text-xs text-white/40"
                      >
                        + Add reference image for face/texture transfer
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 bg-[#18181f] p-2 rounded-xl">
                        <img src={editReference.url} alt="Reference" className="w-10 h-10 rounded-lg object-cover" />
                        <span className="text-xs text-white/80 flex-1 truncate">{editReference.name}</span>
                        <button type="button" onClick={() => setEditReference(null)} className="text-red-400 p-1">
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    <input
                      ref={editRefInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleEditRefUpload(e.target.files[0])}
                    />
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 text-xs text-white/60 leading-relaxed">
                  <p className="font-semibold text-white/80 mb-1">Clean Plate Inpainting</p>
                  <p className="text-[11px] text-white/45">
                    Paint over unwanted elements, watermarks, or objects. OpenHiggs will reconstruct and blend the background seamlessly.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Accent Action Button (Matching VideoStudio) */}
          <div className="mt-auto pt-3">
            <button
              type="button"
              disabled={isGenerating || isUploading}
              onClick={handleGenerate}
              className="w-full bg-[var(--color-accent)] hover:opacity-90 text-white font-bold text-sm py-3.5 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer interactive-hover active:scale-[0.98]"
            >
              {isGenerating ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>{subTab === 'edit' ? 'Applying Edit…' : 'Generating Image…'}</span>
                </>
              ) : (
                <>
                  <SparkleIcon className="w-4 h-4 text-white" />
                  <span>
                    {subTab === 'edit' 
                      ? (editMode === 'clean_plate' ? 'Clean Plate ✦ Local' : 'Replace Object ✦ Local') 
                      : 'Generate Image ✦ Local'}
                  </span>
                </>
              )}
            </button>

            {generationError && (
              <p role="alert" className="text-xs text-red-400 mt-2 whitespace-normal text-center">
                {generationError}
              </p>
            )}
          </div>
        </div>
      </aside>

      {/* ──────────────────────────────────────────────────────────────────────────
          MAIN WORKSPACE: GenerationHistory (Default Masonry, Hover Icons, Popup Modal)
          ────────────────────────────────────────────────────────────────────────── */}
      <GenerationHistory
        mediaType="image"
        refreshKey={historyVersion}
        disabled={isGenerating}
        onReuse={handleReuse}
      />

      {/* ──────────────────────────────────────────────────────────────────────────
          MODEL SELECTION MODAL
          ────────────────────────────────────────────────────────────────────────── */}
      {showModelModal && (
        <div 
          role="dialog" 
          aria-modal="true" 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
        >
          <div className="w-full max-w-lg bg-[#14141a] rounded-3xl p-6 shadow-2xl border border-white/10 flex flex-col gap-4 animate-scale-in">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <h2 className="text-sm font-black text-white uppercase tracking-wider">Select Diffusion Model</h2>
              <button
                type="button"
                onClick={() => setShowModelModal(false)}
                className="text-white/40 hover:text-white p-1 rounded-lg"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            <input
              type="text"
              placeholder="Search models..."
              value={modelSearch}
              onChange={(e) => setModelSearch(e.target.value)}
              className="w-full bg-[#18181f] border border-white/5 focus:border-[var(--color-accent)] rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 outline-none"
            />

            <div className="flex flex-col gap-2 max-h-80 overflow-y-auto custom-scrollbar">
              {t2iModels.filter(m => m.name.toLowerCase().includes(modelSearch.toLowerCase()) || m.id.toLowerCase().includes(modelSearch.toLowerCase())).map((model) => (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => {
                    setSelectedModel(model);
                    setShowModelModal(false);
                  }}
                  className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition-all ${
                    selectedModel.id === model.id
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent-subtle)]'
                      : 'border-white/5 hover:border-white/15 bg-white/[0.01]'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-black/50 p-1 flex items-center justify-center border border-white/10">
                    <img
                      src={getModelIcon(model) || '/assets/models/minimax-color.png'}
                      alt=""
                      className="w-6 h-6 object-contain"
                    />
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-xs font-bold text-white truncate">{model.name}</span>
                    <span className="text-[10px] text-white/50 truncate">{model.description}</span>
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
