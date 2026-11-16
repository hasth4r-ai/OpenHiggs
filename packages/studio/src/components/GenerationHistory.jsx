'use client';
import {useState,useEffect,useRef} from 'react';
import {HistoryClockIcon,DownloadIcon,CloseIcon,ClapperboardIcon,RefreshIcon,CopyIcon,TrashIcon} from './icons.jsx';
import CustomSelect from './CustomSelect.jsx';

const time = seconds => `${Math.floor(Math.max(0,seconds)/60)}m ${Math.floor(Math.max(0,seconds)%60)}s`;
const getModelName = (item) => {
  if (!item) return 'Wan 2.1 (Vace 14B FusioniX)';
  const file = (item.fileName || item.id || '').toLowerCase();
  if (file.includes('wan')) return 'Wan 2.1 (Vace 14B FusioniX)';
  if (item.inpaintRequest || item.workflow === 'inpaint' || file.startsWith('inpaint_') || item.model?.includes('Inpaint')) {
    const m = item.inpaintRequest?.model;
    if (m === 'minimax_h3') return 'MiniMax H3 Inpaint';
    return 'Wan 2.1 (Vace 14B FusioniX)';
  }
  if (item.workflow === 'motion') return 'Wan 2.1 Motion Control';
  return item.model || 'MiniMax H3';
};
const dateLabel = value => {
  const date=new Date(value),today=new Date();
  if(date.toDateString()===today.toDateString()) return 'Today';
  today.setDate(today.getDate()-1);
  return date.toDateString()===today.toDateString()?'Yesterday':date.toLocaleDateString(undefined,{month:'long',day:'numeric',year:'numeric'});
};

export default function GenerationHistory({refreshKey,onReuse,disabled,onBusyChange,mediaType='all'}) {
  const [items,setItems]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const [query,setQuery]=useState(''),[filter,setFilter]=useState('all');
  const [view,setView]=useState(()=> (typeof window !== 'undefined' && localStorage.getItem('openhiggs-history-view')) || 'masonry');
  const [detail,setDetail]=useState(null),[notice,setNotice]=useState(''),[now,setNow]=useState(Date.now());
  const [selectedVarIndex,setSelectedVarIndex]=useState(0);
  const dialog=useRef(null);
  const [pending,setPending]=useState(null);
  const [deleted,setDeleted]=useState(null);

  const act=async(item,action)=>{
    setPending(item.id);
    try {
      const response=await fetch('/api/history-actions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:item.id,action})});
      const result=await response.json();if(!response.ok)throw new Error(result.error);
      if(action==='delete'){setDeleted(item);setItems(previous=>previous.filter(i=>i.id!==item.id));if(detail?.id===item.id)dialog.current?.close();setNotice('Removed from history.');}
      else if(action==='restore'){setDeleted(null);setItems(previous=>[...previous.filter(i=>i.id!==item.id),item].sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt)));setNotice('History entry restored.');}
      else{setItems(previous=>previous.map(i=>i.id===item.id?{...i,cancelRequested:true,phase:'Cancelling…',eta:null}:i));setNotice('Cancellation requested.');}
    }catch(e){setNotice(e.message);}
    finally{setPending(null);}
  };

  useEffect(()=>{
    const saved=localStorage.getItem('openhiggs-history-view');
    if(['list','grid','masonry'].includes(saved)) setView(saved);
    else setView('masonry');
  },[]);

  useEffect(()=>{
    let stopped=false,controller;
    const load=async()=>{
      controller=new AbortController();
      try {
        const response=await fetch('/api/history',{cache:'no-store',signal:controller.signal});
        if(!response.ok)throw new Error('History could not be loaded. Retrying…');
        const data=await response.json();if(!stopped){setItems(data.items);setError('');}
      }catch(e){if(!stopped && e.name!=='AbortError')setError(e.message);}
      finally{if(!stopped)setLoading(false);}
    };
    load();const timer=setInterval(load,3000);
    return()=>{stopped=true;clearInterval(timer);controller?.abort();};
  },[refreshKey]);

  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
  useEffect(()=>{if(detail && !dialog.current?.open)dialog.current?.showModal();},[detail]);
  useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(''),3000);return()=>clearTimeout(timer);},[notice]);
  const busy=disabled || items.some(i=>i.status==='generating');
  useEffect(()=>{onBusyChange?.(items.some(i=>i.status==='generating'));},[items,onBusyChange]);
  const changeView=value=>{setView(value);localStorage.setItem('openhiggs-history-view',value);};
  const copy=async item=>{try{await navigator.clipboard.writeText(item.prompt);setNotice('Prompt copied');}catch{setNotice('Could not copy. Open the details to select the prompt.');}};

  const typeFiltered = items.filter(i => {
    const isImage = i.workflow === 'image' || (i.model && i.model.toLowerCase().includes('image')) || /\.(png|jpe?g|webp)$/i.test(i.fileName || i.url || '');
    if (mediaType === 'image') return isImage;
    if (mediaType === 'video') return !isImage;
    return true;
  });

  const filtered=typeFiltered.filter(i=>(filter==='all'||i.status===filter||(filter==='failed'&&i.status==='interrupted'))&&`${i.prompt} ${i.model} ${i.fileName}`.toLowerCase().includes(query.toLowerCase()));
  const groups=Object.entries(filtered.reduce((out,item)=>{(out[dateLabel(item.createdAt)] ||= []).push(item);return out;},{}));
  const button='rounded-xl bg-white/5 hover:bg-white/10 px-3 py-2 text-xs font-semibold text-white/80 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all interactive-hover';

  const preview=(item, inModal = false)=>{
    const isImage = item.workflow === 'image' || (item.model && item.model.toLowerCase().includes('image')) || /\.(png|jpe?g|webp)$/i.test(item.fileName || item.url || '');
    const images = item.images && item.images.length ? item.images : (item.url || item.imageUrl) ? [{ url: item.url || item.imageUrl, fileName: item.fileName }] : [];
    const mediaUrl = item.videoUrl || item.url || item.imageUrl;

    if (item.status === 'completed') {
      if (isImage) {
        if (inModal) {
          const activeImg = images[selectedVarIndex] || images[0] || { url: mediaUrl };
          return (
            <div className="w-full h-full flex flex-col items-center justify-center p-2">
              <img 
                key={activeImg.url} 
                src={activeImg.url} 
                alt={item.prompt || 'Generated image'} 
                className="max-w-full max-h-[66vh] object-contain rounded-2xl select-none shadow-2xl" 
              />
              {images.length > 1 && (
                <div className="flex items-center gap-2 mt-4 bg-white/5 p-1.5 rounded-xl border border-white/5">
                  {images.map((img, idx) => (
                    <button
                      key={img.url || idx}
                      type="button"
                      onClick={() => setSelectedVarIndex(idx)}
                      className={`relative w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${selectedVarIndex === idx ? 'border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/30 scale-105' : 'border-transparent opacity-60 hover:opacity-100'}`}
                    >
                      <img src={img.url} alt={`Var ${idx + 1}`} className="w-full h-full object-cover" />
                      <span className="absolute bottom-0.5 right-0.5 bg-black/80 px-1 py-0.2 rounded text-[9px] font-mono text-white/90">#{idx + 1}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        }

        // Multiple images batch in card (Masonry / Grid / List):
        if (images.length > 1) {
          const count = images.length;
          return (
            <div 
              className={`w-full grid ${count === 2 ? 'grid-cols-2' : 'grid-cols-2 grid-rows-2'} gap-1 bg-[#0c0c10] select-none p-1 rounded-2xl overflow-hidden`}
            >
              {images.slice(0, 4).map((img, idx) => (
                <div 
                  key={img.url || idx}
                  className="relative group/var rounded-xl overflow-hidden bg-black/50 aspect-square flex items-center justify-center"
                >
                  <img 
                    src={img.url} 
                    alt={`Variation ${idx + 1}`} 
                    className="w-full h-full object-cover" 
                    loading="lazy" 
                  />
                  <span className="absolute top-1 left-1 bg-black/75 backdrop-blur px-1.5 py-0.5 rounded text-[9px] font-mono text-white/90 border border-white/10">
                    #{idx + 1}
                  </span>
                </div>
              ))}
            </div>
          );
        }

        // Single image in card:
        const singleUrl = images[0]?.url || mediaUrl;
        return (
          <img 
            key={singleUrl} 
            src={singleUrl} 
            alt={item.prompt || 'Generated image'} 
            className="w-full h-auto object-cover select-none block rounded-2xl" 
            loading="lazy"
          />
        );
      }

      if (!isImage && item.videoUrl) {
        if (inModal) {
          return (
            <video 
              key={item.videoUrl} 
              src={`${item.videoUrl}#t=0.1`} 
              controls 
              playsInline 
              autoPlay
              className="max-w-full max-h-[66vh] object-contain rounded-2xl bg-black" 
              aria-label={`Generated video: ${item.prompt || 'Video'}`}
            />
          );
        }
        return (
          <video 
            key={item.videoUrl} 
            src={`${item.videoUrl}#t=0.1`} 
            muted
            loop
            playsInline 
            preload="metadata" 
            className="w-full h-auto object-cover select-none block aspect-video rounded-2xl" 
            aria-label={`Generated video: ${item.prompt || 'Video'}`}
          />
        );
      }
    }

    return (
      <div className="min-h-52 h-full flex flex-col justify-center items-center p-7 text-center gap-3 bg-[var(--bg-card,#14141a)] rounded-2xl border border-white/5">
        {item.status==='generating'?<><span className="w-8 h-8 border-2 border-white/10 border-t-[var(--color-accent)] rounded-full animate-spin"/><p className="text-xs text-white/80">{item.phase || 'Generating…'}</p><div role="progressbar" aria-label="Generation progress" aria-valuenow={Math.round(item.progress||0)} aria-valuemin={0} aria-valuemax={100} className="w-full max-w-xs h-1.5 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-[var(--color-accent)] transition-all" style={{width:`${item.progress||0}%`}}/></div><p className="text-xs text-white/45">{Math.round(item.progress||0)}% · {time((now-Date.parse(item.createdAt))/1000)} elapsed</p><p className="text-xs text-white/45">{Number.isFinite(item.eta)?`About ${time(item.eta)} left in this sampling pass`:'Estimating remaining time…'}</p></>:<><ClapperboardIcon className="w-8 h-8 text-white/30"/><p className="text-sm text-red-300">{item.status==='cancelled'?'Generation cancelled':item.status==='interrupted'?'Generation interrupted':'Generation failed'}</p><p className="text-xs text-white/50 max-w-xs">{item.error}</p></>}
      </div>
    );
  };

  return (
    <main className="flex-1 min-w-0 h-full overflow-y-auto custom-scrollbar bg-[var(--bg-app,rgb(9,9,11))] select-text">
      <header className="sticky top-0 z-20 bg-[var(--bg-app,rgb(9,9,11))]/95 backdrop-blur-md shadow-md px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/5">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 rounded-xl bg-white/[0.06] px-3 py-2 text-xs font-semibold">
            <HistoryClockIcon className="w-4 h-4 text-white/70"/>
            History
          </span>
          <span className="text-xs text-white/40">
            {typeFiltered.length} {mediaType === 'image' ? 'images' : mediaType === 'video' ? 'videos' : 'items'}
          </span>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <input 
            aria-label="Search generations" 
            placeholder="Search prompts…" 
            value={query} 
            onChange={e=>setQuery(e.target.value)} 
            className="w-40 xl:w-56 text-xs bg-[var(--bg-card,#14141a)] rounded-xl px-3.5 py-2.5 outline-none focus:ring-1 focus:ring-[var(--color-accent)] text-white transition-all border border-white/5"
          />
          <div className="w-36">
            <CustomSelect
              value={filter}
              onChange={e => setFilter(e.target.value)}
              options={[
                ['all', mediaType === 'image' ? 'All images' : mediaType === 'video' ? 'All videos' : 'All items'],
                ['completed', 'Completed'],
                ['generating', 'In progress'],
                ['cancelled', 'Cancelled'],
                ['failed', 'Failed / interrupted']
              ]}
              className="!bg-[var(--bg-card,#14141a)] !py-2 !rounded-xl !border-white/5"
            />
          </div>
          <div className="flex rounded-xl bg-[var(--bg-card,#14141a)] p-1 gap-0.5 border border-white/5" role="group" aria-label="History layout">
            {['masonry', 'grid', 'list'].map(v=>(
              <button 
                key={v} 
                aria-pressed={view===v} 
                onClick={()=>changeView(v)} 
                className={`px-3 py-1.5 rounded-lg text-xs capitalize font-medium transition-all ${view===v?'bg-[var(--color-accent)] text-white shadow-sm':'text-white/40 hover:text-white'}`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </header>

      {error && <p role="alert" className="mx-6 mt-4 text-sm text-red-300">{error}</p>}
      {(notice||deleted) && (
        <div role="status" className="fixed z-50 right-8 bottom-6 bg-[var(--color-accent)] text-white rounded-xl px-4 py-3 text-sm shadow-xl animate-scale-in">
          {notice||'Entry removed. Saved file kept.'}
          {deleted&&<button className="ml-4 underline font-semibold" disabled={pending===deleted.id} onClick={()=>act(deleted,'restore')}>Undo delete</button>}
          {deleted&&<button aria-label="Dismiss deletion notice" className="ml-4" onClick={()=>{setDeleted(null);setNotice('');}}>×</button>}
        </div>
      )}

      <div className="px-6 pb-12 pt-4">
        {loading ? (
          <p className="py-12 text-sm text-white/40 text-center">Loading {mediaType === 'image' ? 'images' : mediaType === 'video' ? 'videos' : 'generations'}…</p>
        ) : groups.length === 0 ? (
          <div className="min-h-[55vh] flex flex-col items-center justify-center text-center gap-3">
            <ClapperboardIcon className="w-10 h-10 text-white/20"/>
            <h1 className="text-lg font-semibold">{items.length?`No matching ${mediaType === 'image' ? 'images' : mediaType === 'video' ? 'videos' : 'generations'}`:`Your ${mediaType === 'image' ? 'images' : mediaType === 'video' ? 'videos' : 'generations'} will appear here`}</h1>
            <p className="text-sm text-white/40">{items.length?'Try another search or filter.':'Add a prompt or references, then click Generate.'}</p>
          </div>
        ) : (
          groups.map(([day,entries])=>(
            <section key={day} aria-label={day} className="mb-8">
              <h2 className="text-xs font-semibold text-white/40 py-3 uppercase tracking-wider flex items-center gap-2">
                <span>{day}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 font-mono text-white/30">{entries.length}</span>
              </h2>

              {/* Masonry / Grid / List Layout */}
              <div className={
                view === 'masonry'
                  ? 'columns-1 sm:columns-2 lg:columns-3 2xl:columns-4 gap-4'
                  : view === 'grid'
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4'
                  : 'flex flex-col gap-4'
              }>
                {entries.map(item => {
                  const itemIsImage = item.workflow === 'image' || (item.model && item.model.toLowerCase().includes('image')) || /\.(png|jpe?g|webp)$/i.test(item.fileName || item.url || '');
                  const hasMultiple = item.images && item.images.length > 1;
                  const currentMedia = (item.images && item.images[0]) || { url: item.videoUrl || item.url || item.imageUrl, fileName: item.fileName };
                  const mediaUrl = currentMedia.url;

                  return (
                    <article 
                      key={item.id}
                      onClick={() => { setSelectedVarIndex(0); setDetail(item); }}
                      className={`group relative overflow-hidden rounded-2xl bg-[#14141a] border border-white/5 hover:border-[var(--color-accent)]/50 transition-all duration-300 shadow-md hover:shadow-2xl cursor-pointer ${
                        view === 'masonry' ? 'break-inside-avoid mb-4' : view === 'grid' ? 'aspect-square flex items-center justify-center' : 'flex flex-col sm:flex-row'
                      }`}
                    >
                      <div className="relative w-full h-full overflow-hidden bg-[#0c0c10] flex items-center justify-center">
                        {preview(item)}

                        {/* Hover Overlay with Metadata and Icon-Only Buttons */}
                        {item.status === 'completed' && (
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-3.5 z-10 pointer-events-none group-hover:pointer-events-auto">
                            {/* Top: Metadata */}
                            <div className="flex items-center justify-between text-xs text-white/90">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-white drop-shadow text-[11px]">{getModelName(item)}</span>
                                <span className="text-white/40">·</span>
                                <span className="text-[10px] text-white/70 drop-shadow">{item.quality || item.resolution || (itemIsImage ? '1024x1024' : 'Video')}</span>
                                {hasMultiple && (
                                  <span className="px-1.5 py-0.5 rounded bg-[var(--color-accent)] text-white text-[9px] font-bold shadow-sm">
                                    Batch ({item.images.length})
                                  </span>
                                )}
                              </div>
                              <time className="text-[10px] text-white/60 font-mono drop-shadow">
                                {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </time>
                            </div>

                            {/* Bottom: Action Buttons as ICONS ONLY */}
                            <div className="flex items-center justify-end gap-1.5 pt-2">
                              {item.prompt && (
                                <button
                                  type="button"
                                  title="Reuse settings"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onReuse(item);
                                    setNotice('Settings restored.');
                                  }}
                                  className="w-8 h-8 rounded-xl bg-black/75 hover:bg-[var(--color-accent)] backdrop-blur text-white/80 hover:text-white flex items-center justify-center transition-all shadow border border-white/10"
                                >
                                  <RefreshIcon className="w-4 h-4" />
                                </button>
                              )}

                              {item.prompt && (
                                <button
                                  type="button"
                                  title="Copy prompt"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copy(item);
                                  }}
                                  className="w-8 h-8 rounded-xl bg-black/75 hover:bg-[var(--color-accent)] backdrop-blur text-white/80 hover:text-white flex items-center justify-center transition-all shadow border border-white/10"
                                >
                                  <CopyIcon className="w-4 h-4" />
                                </button>
                              )}

                              {mediaUrl && (
                                <a
                                  title="Download"
                                  href={mediaUrl}
                                  download={currentMedia.fileName || item.fileName || 'download'}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-8 h-8 rounded-xl bg-black/75 hover:bg-[var(--color-accent)] backdrop-blur text-white/80 hover:text-white flex items-center justify-center transition-all shadow border border-white/10"
                                >
                                  <DownloadIcon className="w-4 h-4" />
                                </a>
                              )}

                              <button
                                type="button"
                                title="Delete from history"
                                disabled={pending === item.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  act(item, 'delete');
                                }}
                                className="w-8 h-8 rounded-xl bg-black/75 hover:bg-red-500 backdrop-blur text-white/80 hover:text-white flex items-center justify-center transition-all shadow border border-white/10"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>

      {/* Rich Detail Modal Popup */}
      <dialog 
        ref={dialog} 
        onCancel={()=>setDetail(null)} 
        onClose={()=>setDetail(null)} 
        onClick={e=>{if(e.target===dialog.current)dialog.current.close();}} 
        className="fixed inset-0 m-auto w-[min(1150px,94vw)] max-h-[92vh] rounded-3xl bg-[#111115] text-white p-0 shadow-2xl backdrop:bg-black/85 animate-scale-in border border-white/10 overflow-hidden"
      >
        {detail && (
          <>
            <header className="px-6 py-4 flex items-center justify-between border-b border-white/10 bg-[#14141a]">
              <div className="flex items-center gap-3">
                <span className="font-bold text-sm text-white">{getModelName(detail)}</span>
                <span className="text-white/30">·</span>
                <span className="text-xs text-white/50">{detail.quality || detail.resolution || 'Generated Media'}</span>
                {detail.images?.length > 1 && (
                  <span className="px-2 py-0.5 rounded-md bg-[var(--color-accent)]/20 text-[var(--color-accent)] text-xs font-bold">
                    Batch of {detail.images.length}
                  </span>
                )}
              </div>
              <button 
                aria-label="Close generation details" 
                onClick={()=>dialog.current.close()} 
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 flex items-center justify-center text-white/70 hover:text-white transition-all"
              >
                <CloseIcon className="w-4 h-4"/>
              </button>
            </header>

            <div className="grid lg:grid-cols-[1.5fr_1fr] h-[calc(92vh-65px)]">
              {/* Left: Media viewer */}
              <div className="bg-black/90 flex items-center justify-center p-6 overflow-hidden">
                {preview(detail, true)}
              </div>

              {/* Right: Metadata, Prompt, Actions */}
              <div className="p-6 flex flex-col justify-between overflow-y-auto bg-[#14141a] border-l border-white/5 custom-scrollbar">
                <div className="flex flex-col gap-5">
                  <div>
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Created</span>
                    <p className="text-xs text-white/80 mt-1 font-mono">{new Date(detail.createdAt).toLocaleString()}</p>
                  </div>

                  {detail.prompt && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Prompt</span>
                        <button onClick={()=>copy(detail)} className="text-[11px] text-[var(--color-accent)] hover:underline flex items-center gap-1 font-semibold">
                          <CopyIcon className="w-3.5 h-3.5"/> Copy
                        </button>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 text-xs text-white/90 leading-relaxed max-h-48 overflow-y-auto custom-scrollbar select-text">
                        {detail.prompt}
                      </div>
                    </div>
                  )}

                  {detail.references && detail.references.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Attached References ({detail.references.length})</span>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {detail.references.map((r, i) => (
                          <div key={r.id || i} className="relative w-12 h-12 rounded-xl overflow-hidden bg-black/60 border border-white/10 group">
                            <img src={r.url} alt={r.name || `Ref ${i + 1}`} className="w-full h-full object-cover" />
                            <span className="absolute bottom-0.5 right-0.5 bg-black/80 px-1 py-0.2 rounded text-[8px] font-mono text-[var(--color-accent-text)]">
                              {r.tag || `@image${i + 1}`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2.5 pt-2">
                    {detail.resolution && (
                      <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                        <span className="text-[10px] font-bold text-white/40 uppercase">Resolution</span>
                        <p className="text-xs font-semibold text-white/90 mt-0.5">{detail.resolution}</p>
                      </div>
                    )}
                    {detail.aspectRatio && (
                      <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                        <span className="text-[10px] font-bold text-white/40 uppercase">Aspect Ratio</span>
                        <p className="text-xs font-semibold text-white/90 mt-0.5">{detail.aspectRatio}</p>
                      </div>
                    )}
                    {detail.seed !== undefined && (
                      <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                        <span className="text-[10px] font-bold text-white/40 uppercase">Seed</span>
                        <p className="text-xs font-semibold text-white/90 mt-0.5 font-mono">{detail.seed}</p>
                      </div>
                    )}
                    {detail.images?.length > 1 && (
                      <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                        <span className="text-[10px] font-bold text-white/40 uppercase">Variation</span>
                        <p className="text-xs font-semibold text-white/90 mt-0.5">#{selectedVarIndex + 1} of {detail.images.length}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-6 border-t border-white/5 mt-6 flex flex-wrap items-center gap-2">
                  <button 
                    className={button} 
                    disabled={!detail.prompt || busy} 
                    onClick={()=>{onReuse(detail);dialog.current?.close();setNotice('Settings restored.');}}
                  >
                    Reuse settings
                  </button>
                  <button 
                    className={button} 
                    disabled={!detail.prompt} 
                    onClick={()=>copy(detail)}
                  >
                    Copy prompt
                  </button>
                  {((detail.images && detail.images[selectedVarIndex]) || detail.url || detail.videoUrl) && (
                    <a 
                      className={button+' flex items-center gap-1.5 !text-[var(--color-accent)] font-semibold'} 
                      href={(detail.images && detail.images[selectedVarIndex]?.url) || detail.url || detail.videoUrl} 
                      download={detail.images?.[selectedVarIndex]?.fileName || detail.fileName || 'download'}
                    >
                      <DownloadIcon className="w-3.5 h-3.5"/>
                      Download {detail.images?.length > 1 ? `Var #${selectedVarIndex + 1}` : 'Media'}
                    </a>
                  )}
                  {detail.status !== 'generating' && (
                    <button 
                      className={button+' !text-white/40 hover:!text-red-400 ml-auto'} 
                      disabled={pending===detail.id} 
                      onClick={()=>act(detail,'delete')}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </dialog>
    </main>
  );
}
