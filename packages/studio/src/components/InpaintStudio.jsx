'use client';
import {useState,useEffect} from 'react';
import VideoWorkflowTabs from './VideoWorkflowTabs.jsx';
import {processingSize} from '../inpaintResolution.mjs';
import GenerationHistory from './GenerationHistory.jsx';
import CustomSelect from './CustomSelect.jsx';

const VANCE_WORKFLOW_PROMPT = "A close shot of the reference man in a dim interior, his head tilted downward and both hands raised beside his fully uncovered face. His facial features, nose, mouth, cheeks, skin texture, and short hair match the supplied face reference. His hands are empty, with naturally curved fingers following the original movement. The space between his hands and face reveals his black shirt and the softly blurred background. Subtle purple light falls across his skin, with warm background illumination, deep shadows, soft focus, motion blur, and film grain matching the source footage. His ring, black wristwatch, and purple wristband retain their original appearance. Facial identity and anatomy remain consistent throughout the original head movement and camera motion.";

const defaults = {
  model: 'wan21',
  processingResolution: '1080',
  mode: 'remove',
  source: '',
  mask: '',
  reference: '',
  prompt: '',
  profile: '422hq',
  denoise: 0.85,
  expand: 32,
  feather: 4,
  invert: false,
  keepAudio: true
};

export default function InpaintStudio({onNavigate,initialDraft,blocked=false}) {
  const [form,setForm]=useState({...defaults,...initialDraft}),[names,setNames]=useState({}),[info,setInfo]=useState(null);
  const [uploading,setUploading]=useState(''),[error,setError]=useState(''),[status,setStatus]=useState(''),[generating,setGenerating]=useState(false),[busy,setBusy]=useState(false),[refresh,setRefresh]=useState(0);
  const [previews,setPreviews]=useState({});

  useEffect(()=>{
    let active=true;
    for(const key of ['source','mask']){
      const url=form[key];if(!url)continue;
      setPreviews(old=>({...old,[key]:{input:url,loading:true}}));
      fetch('/api/inpaint/preview',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url})}).then(async response=>{const result=await response.json();if(!response.ok)throw new Error(result.error);if(active)setPreviews(old=>({...old,[key]:{input:url,url:result.url}}));}).catch(error=>{if(active)setPreviews(old=>({...old,[key]:{input:url,error:error.message}}));});
    }
    return()=>{active=false;};
  },[form.source,form.mask]);

  const size=info?processingSize(info.source,form.processingResolution):null;
  const update=(key,value)=>setForm(old=>({...old,[key]:value}));

  const resetToDefaults = () => {
    setForm(defaults);
    setNames({});
    setInfo(null);
    setPreviews({});
    try {
      localStorage.removeItem('openhiggs_inpaint_studio_state_v1');
    } catch {}
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem('openhiggs_inpaint_studio_state_v1');
      if (!raw) return;
      const s = JSON.parse(raw);
      if (s.form) {
        setForm(old => ({ ...old, ...s.form, ...(initialDraft || {}) }));
      }
      if (s.names) {
        setNames(s.names);
      }
    } catch (e) {
      console.error('Failed to restore inpaint studio state:', e);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('openhiggs_inpaint_studio_state_v1', JSON.stringify({ form, names }));
    } catch {}
  }, [form, names]);

  useEffect(()=>{if(initialDraft){setForm({...defaults,...initialDraft});setInfo(null);}},[initialDraft]);

  useEffect(()=>{
    if(!form.source){setInfo(null);return;}
    const controller=new AbortController();setInfo(null);setError('');
    fetch('/api/inpaint/inspect',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({source:form.source,mask:form.mask}),signal:controller.signal}).then(async response=>{const data=await response.json();if(!response.ok)throw new Error(data.error);setInfo(data);}).catch(e=>{if(e.name!=='AbortError')setError(e.message);});
    return()=>controller.abort();
  },[form.source,form.mask]);

  const upload=async(key,file)=>{
    if(!file)return;setUploading(key);setError('');
    try{const data=new FormData();data.append('file',file);const response=await fetch('/api/upload',{method:'POST',body:data});const result=await response.json();if(!response.ok)throw new Error(result.msg||'Upload failed');update(key,result.data.url);setNames(old=>({...old,[key]:file.name}));}catch(e){setError(e.message);}finally{setUploading('');}
  };

  const submit=async()=>{
    setError('');setStatus('Connecting to Wan2GP…');setGenerating(true);setRefresh(v=>v+1);
    try {
      const response=await fetch('/api/inpaint',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});
      if(!response.ok){const data=await response.json();throw new Error(data.error);}
      const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='',terminal=false;
      while(true){const {done,value}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});const parts=buffer.split('\n\n');buffer=parts.pop()||'';
        for(const part of parts){if(!part.startsWith('data: '))continue;const event=JSON.parse(part.slice(6));if(event.type==='error')throw new Error(event.message);if(event.type==='progress')setStatus(event.phase);if(event.type==='done'||event.type==='cancelled'){terminal=true;setStatus(event.type==='done'?'ProRes MOV and MP4 preview ready.':'Cancelled');setRefresh(v=>v+1);}}
      }
      if(!terminal)throw new Error('Connection ended. Check history and Wan2GP before retrying.');
    }catch(e){setError(e.message);setStatus('');}finally{setGenerating(false);setRefresh(v=>v+1);}
  };

  const field='w-full rounded-xl bg-[#18181f] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]/40 text-white transition-all';
  const fileSlot=(key,title,optional=false)=><div className="upload-dropzone rounded-2xl p-3 bg-[#18181f]/60 transition-all">
    <div className="flex justify-between gap-2 mb-2"><span className="text-xs font-semibold">{title}{optional&&<span className="text-white/40 font-normal"> · optional</span>}</span>{form[key]&&<button type="button" className="text-xs text-white/40 hover:text-white" disabled={generating} onClick={()=>update(key,'')}>Remove</button>}</div>
    <label className="block text-xs text-white/50 cursor-pointer hover:text-white break-all">
      {uploading===key?'Uploading…':names[key]|| (form[key]?decodeURIComponent(form[key].split('/').pop()):key==='reference'?'Choose a clean frame or replacement image':'Choose MOV, MP4, MKV, WebM or AVI')}
      <input aria-label={title} type="file" disabled={!!uploading||generating} className="block mt-2 w-full text-xs text-white/40 file:mr-2 file:rounded file:border-0 file:bg-white/10 file:text-white file:px-2 file:py-1 cursor-pointer" accept={key==='reference'?'.png,.jpg,.jpeg,.webp':'.mov,.mp4,.mkv,.webm,.avi'} onChange={e=>{upload(key,e.target.files?.[0]);e.target.value='';}}/>
    </label>
    {key!=='reference'&&form[key]&&<div className="mt-3">{previews[key]?.input===form[key]&&previews[key]?.url?<video aria-label={title+' preview'} src={previews[key].url} controls muted playsInline preload="metadata" className="w-full max-h-48 rounded bg-black"/>:<p role="status" className="text-xs text-white/50">{previews[key]?.input===form[key]&&previews[key]?.error||'Preparing preview…'}</p>}</div>}
    {key==='reference'&&form.reference&&<img src={form.reference} alt="Inpaint reference" className="mt-3 w-full max-h-32 object-contain rounded"/>}
  </div>;

  return <div className="flex h-full min-h-0 bg-[#09090b] text-white">
    <aside className="studio-sidebar shrink-0 overflow-y-auto custom-scrollbar bg-[#111115] shadow-2xl">
      <VideoWorkflowTabs active="edit" onChange={onNavigate}/>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold">Video Inpaint</h1>
            <p className="text-xs text-white/40 mt-1">Wan 2.1 Vace 14B & MiniMax H3 · masked footage editing</p>
          </div>
          <button
            type="button"
            onClick={resetToDefaults}
            disabled={generating}
            className="text-[11px] text-white/40 hover:text-white px-2 py-1 rounded-md bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
            title="Reset all inpaint settings and inputs to default"
          >
            Reset
          </button>
        </div>

        {/* Model Selector */}
        <div className="flex items-center justify-between bg-[#18181f] p-2.5 rounded-xl">
          <span className="text-xs font-bold text-white/60">Model</span>
          <div className="w-56">
            <CustomSelect
              value={form.model || 'wan21'}
              disabled={generating}
              onChange={e => update('model', e.target.value)}
              options={[
                ['wan21', 'Wan 2.1 (Vace 14B FusioniX)'],
                ['minimax_h3', 'MiniMax H3']
              ]}
              size="sm"
              className="!bg-transparent !border-0 !p-0 !text-xs !font-bold text-right"
              align="right"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 bg-[#18181f] rounded-xl p-1 gap-1">
          {[['remove','Remove / Clean plate'],['replace','Replace object']].map(([value,label])=><button key={value} disabled={generating} aria-pressed={form.mode===value} onClick={()=>update('mode',value)} className={`text-xs py-2 rounded-lg transition-all ${form.mode===value?'bg-[var(--color-accent)] text-white font-semibold shadow-md':'text-white/50 hover:text-white'}`}>{label}</button>)}
        </div>

        {fileSlot('source','Source video')}
        {fileSlot('mask','Mask video')}
        <p className="text-xs text-white/40">White = edit. Black = keep. The mask must match the source dimensions, frame rate and frame count.</p>
        <label className="flex gap-2 text-xs text-white/70 cursor-pointer"><input type="checkbox" checked={form.invert} onChange={e=>update('invert',e.target.checked)}/>Invert mask (edit black areas)</label>
        {info&&<p className="text-xs text-[var(--color-accent-text)]">{info.source.width} × {info.source.height} · {info.source.fps.toFixed(3)} fps · {info.source.duration.toFixed(2)}s{info.aligned?' · Mask aligned':''}</p>}

        <div className="space-y-1.5">
          <label className="block text-xs text-white/70">Processing resolution</label>
          <CustomSelect
            value={form.processingResolution}
            disabled={generating}
            onChange={e => update('processingResolution', e.target.value)}
            options={[
              ['1080', '1080p (1920×1088) — High fidelity'],
              ['720', '720p (1280×720) — Balanced'],
              ['480', '480p (848×480) — Fast preview']
            ]}
          />
        </div>
        <p className="text-xs text-white/40">{size?'AI processing: '+size.width+' × '+size.height+'. ':''}ProRes output stays at source resolution. Lower settings upscale the edited region; they do not restore native 4K detail.</p>

        {fileSlot('reference','Reference image',true)}
        <p className="text-xs text-white/40">Clean plate or reference image injected via MVAKI into the inpainting region.</p>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold">Instruction</span>
            <button
              type="button"
              onClick={() => update('prompt', VANCE_WORKFLOW_PROMPT)}
              className="text-[10px] text-[var(--color-accent-text)] hover:underline"
            >
              Load Vance14B Workflow Prompt
            </button>
          </div>
          <textarea
            aria-label="Inpaint instruction"
            value={form.prompt}
            disabled={generating}
            onChange={e=>update('prompt',e.target.value)}
            placeholder={VANCE_WORKFLOW_PROMPT}
            className={field+' min-h-28 resize-y font-normal'}
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs text-white/70">MOV output</label>
          <CustomSelect
            value={form.profile}
            onChange={e => update('profile', e.target.value)}
            options={[
              ['422', 'ProRes 422'],
              ['422hq', 'ProRes 422 HQ'],
              ['4444', 'ProRes 4444 (opaque)']
            ]}
          />
        </div>
        <label className="flex gap-2 text-xs text-white/70 cursor-pointer"><input type="checkbox" checked={form.keepAudio} onChange={e=>update('keepAudio',e.target.checked)}/>Keep original audio</label>

        <details className="rounded-xl bg-[#18181f] p-3 text-xs">
          <summary className="cursor-pointer text-white/70">Mask edges and edit strength</summary>
          <div className="space-y-3 mt-4">
            {[['denoise','Edit strength',0.1,1,0.05],['expand','Expand mask (pixels)',0,64,1],['feather','Feather edge (pixels)',0,32,1]].map(([key,label,min,max,step])=><label key={key} className="block text-white/60">{label}: {form[key]}<input aria-label={label} type="range" className="w-full accent-[var(--color-accent)] mt-2" min={min} max={max} step={step} value={form[key]} onChange={e=>update(key,Number(e.target.value))}/></label>)}
          </div>
        </details>

        <p className="text-xs text-white/40">Source resolution and frame rate are retained. Only the masked area is composited. An MP4 preview is saved alongside the ProRes master.</p>
        <button onClick={submit} disabled={generating||busy||blocked||!!uploading||!info?.aligned} className="w-full bg-[var(--color-accent)] hover:opacity-90 text-white text-sm font-bold rounded-xl py-3 shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed">{generating?'Editing…':busy||blocked?'Waiting for current generation':'Generate inpaint'}</button>
        {status&&<p role="status" className="text-xs text-white/60">{status}</p>}{error&&<p role="alert" className="text-xs text-red-300">{error}</p>}
      </div>
    </aside>
    <GenerationHistory refreshKey={refresh} disabled={generating} onBusyChange={setBusy} onReuse={item=>{if(item.inpaintRequest){setForm({...defaults,...item.inpaintRequest});setInfo(null);}else setError('This is a Create Video result. Switch to Create Video to reuse it.');}}/>
  </div>;
}
