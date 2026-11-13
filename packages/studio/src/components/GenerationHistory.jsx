'use client';
import {useState,useEffect,useRef} from 'react';
import {HistoryClockIcon,DownloadIcon,CloseIcon,ClapperboardIcon} from './icons.jsx';

const time = seconds => `${Math.floor(Math.max(0,seconds)/60)}m ${Math.floor(Math.max(0,seconds)%60)}s`;
const dateLabel = value => {
  const date=new Date(value),today=new Date();
  if(date.toDateString()===today.toDateString()) return 'Today';
  today.setDate(today.getDate()-1);
  return date.toDateString()===today.toDateString()?'Yesterday':date.toLocaleDateString(undefined,{month:'long',day:'numeric',year:'numeric'});
};

export default function GenerationHistory({refreshKey,onReuse,disabled}) {
  const [items,setItems]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const [query,setQuery]=useState(''),[filter,setFilter]=useState('all'),[view,setView]=useState('list');
  const [detail,setDetail]=useState(null),[notice,setNotice]=useState(''),[now,setNow]=useState(Date.now());
  const dialog=useRef(null);
  const [pending,setPending]=useState(null);
  const [deleted,setDeleted]=useState(null);
  const act=async(item,action)=>{
    setPending(item.id);
    try {
      const response=await fetch('/api/history-actions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:item.id,action})});
      const result=await response.json();if(!response.ok)throw new Error(result.error);
      if(action==='delete'){setDeleted(item);setItems(previous=>previous.filter(i=>i.id!==item.id));if(detail?.id===item.id)dialog.current?.close();setNotice('Removed from history. Saved video kept.');}
      else if(action==='restore'){setDeleted(null);setItems(previous=>[...previous.filter(i=>i.id!==item.id),item].sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt)));setNotice('History entry restored.');}
      else{setItems(previous=>previous.map(i=>i.id===item.id?{...i,cancelRequested:true,phase:'Cancelling…',eta:null}:i));setNotice('Cancellation requested. Waiting for Wan2GP to stop.');}
    }catch(e){setNotice(e.message);}
    finally{setPending(null);}
  };
  useEffect(()=>{const saved=localStorage.getItem('openhiggs-history-view');if(['list','grid','masonry'].includes(saved))setView(saved);},[]);
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
  const changeView=value=>{setView(value);localStorage.setItem('openhiggs-history-view',value);};
  const copy=async item=>{try{await navigator.clipboard.writeText(item.prompt);setNotice('Prompt copied');}catch{setNotice('Could not copy. Open the details to select the prompt.');}};
  const filtered=items.filter(i=>(filter==='all'||i.status===filter||(filter==='failed'&&i.status==='interrupted'))&&`${i.prompt} ${i.model} ${i.fileName}`.toLowerCase().includes(query.toLowerCase()));
  const groups=Object.entries(filtered.reduce((out,item)=>{(out[dateLabel(item.createdAt)] ||= []).push(item);return out;},{}));
  const button='rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-white/75 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors';
  const actions=item=><div className="flex flex-wrap items-center gap-2 mt-4">
    <button className={button} disabled={!item.prompt||busy} onClick={()=>{onReuse(item);dialog.current?.close();setNotice(item.promptSource && !item.references?.length?'Prompt restored. Reattach the original references before generating.':'Settings restored. Edit the prompt, then Generate.');}}>Reuse settings</button>
    <button className={button} disabled={!item.prompt} onClick={()=>copy(item)}>Copy prompt</button>
    {item.videoUrl && <a className={button+' flex items-center gap-1.5'} href={item.videoUrl} download={item.fileName}><DownloadIcon className="w-3.5 h-3.5"/>Download</a>}
    {item.status==='generating'?<button className={button+' !text-red-300'} disabled={pending===item.id||item.cancelRequested} onClick={()=>act(item,'cancel')}>{item.cancelRequested?'Cancelling…':'Cancel task'}</button>:<button className={button+' !text-white/40 hover:!text-red-300'} disabled={pending===item.id} onClick={()=>act(item,'delete')}>Delete from history</button>}
  </div>;
  const preview=item=>item.status==='completed' && item.videoUrl ?
    <video key={item.videoUrl} src={`${item.videoUrl}#t=0.1`} controls playsInline preload="metadata" className="w-full h-full object-contain bg-black" aria-label={`Generated video: ${item.prompt || 'Previous generation'}`}/>:
    <div className="min-h-52 h-full flex flex-col justify-center items-center p-7 text-center gap-3 bg-[#141414]">
      {item.status==='generating'?<><span className="w-8 h-8 border-2 border-white/10 border-t-[#d9ff00] rounded-full animate-spin"/><p className="text-xs text-white/80">{item.phase}</p><div role="progressbar" aria-label="Generation progress" aria-valuenow={Math.round(item.progress||0)} aria-valuemin={0} aria-valuemax={100} className="w-full max-w-xs h-1 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-[#d9ff00] transition-all" style={{width:`${item.progress||0}%`}}/></div><p className="text-xs text-white/45">{Math.round(item.progress||0)}% · {time((now-Date.parse(item.createdAt))/1000)} elapsed</p><p className="text-xs text-white/45">{Number.isFinite(item.eta)?`About ${time(item.eta)} left in this sampling pass`:'Estimating remaining time…'}</p></>:<><ClapperboardIcon className="w-8 h-8 text-white/30"/><p className="text-sm text-red-300">{item.status==='cancelled'?'Generation cancelled':item.status==='interrupted'?'Generation interrupted':'Generation failed'}</p><p className="text-xs text-white/50 max-w-xs">{item.error}</p></>}
    </div>;
  return <main className="flex-1 min-w-0 h-full overflow-y-auto custom-scrollbar bg-[#0c0c0c] select-text">
    <header className="sticky top-0 z-10 bg-[#0c0c0c]/95 backdrop-blur border-b border-white/[0.07] px-6 py-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3"><span className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-semibold"><HistoryClockIcon className="w-4 h-4"/>History</span><span className="text-xs text-white/35">{items.length} videos</span></div>
      <div className="flex flex-wrap gap-2 items-center">
        <input aria-label="Search generations" placeholder="Search prompts…" value={query} onChange={e=>setQuery(e.target.value)} className="w-40 xl:w-52 text-xs bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2.5 outline-none focus:border-white/30"/>
        <select aria-label="Filter generations" value={filter} onChange={e=>setFilter(e.target.value)} className="text-xs bg-[#161616] border border-white/10 rounded-lg px-3 py-2.5"><option value="all">All videos</option><option value="completed">Completed</option><option value="generating">In progress</option><option value="cancelled">Cancelled</option><option value="failed">Failed / interrupted</option></select>
        <div className="flex rounded-lg border border-white/10 p-1 gap-0.5" role="group" aria-label="History layout">{['list','grid','masonry'].map(v=><button key={v} aria-pressed={view===v} onClick={()=>changeView(v)} className={`px-2.5 py-1.5 rounded-md text-xs capitalize ${view===v?'bg-white/10 text-white':'text-white/40 hover:text-white'}`}>{v}</button>)}</div>
      </div>
    </header>
    {error && <p role="alert" className="mx-6 mt-4 text-sm text-red-300">{error}</p>}
    {(notice||deleted) && <div role="status" className="fixed z-50 right-8 bottom-6 bg-[#d9ff00] text-black rounded-xl px-4 py-3 text-sm shadow-xl">{notice||'Entry removed. Saved video kept.'}{deleted&&<button className="ml-4 underline font-semibold" disabled={pending===deleted.id} onClick={()=>act(deleted,'restore')}>Undo delete</button>}{deleted&&<button aria-label="Dismiss deletion notice" className="ml-4" onClick={()=>{setDeleted(null);setNotice('');}}>×</button>}</div>}
    <div className="px-6 pb-12">
      {loading?<p className="py-12 text-sm text-white/40">Loading your videos…</p>:groups.length===0?<div className="min-h-[55vh] flex flex-col items-center justify-center text-center gap-3"><ClapperboardIcon className="w-10 h-10 text-white/20"/><h1 className="text-lg font-semibold">{items.length?'No matching videos':'Your videos will appear here'}</h1><p className="text-sm text-white/40">{items.length?'Try another search or filter.':'Add references and a prompt, then click Generate.'}</p></div>:groups.map(([day,entries])=><section key={day} aria-label={day}>
        <h2 className="text-xs font-medium text-white/45 py-5">{day}<span className="ml-2 text-white/20">{entries.length}</span></h2>
        <div className={view==='list'?'flex flex-col gap-4':view==='grid'?'grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4':'columns-1 xl:columns-2 2xl:columns-3 gap-4'}>
          {entries.map(item=><article key={item.id} className={`border border-white/[0.08] bg-[#111] rounded-2xl overflow-hidden ${view==='list'?'flex flex-col xl:flex-row':view==='masonry'?'break-inside-avoid mb-4':''}`}>
            <div className={`relative bg-black ${view==='list'?'xl:w-[44%] xl:max-w-[620px] shrink-0 aspect-video':view==='masonry'?'min-h-40':'aspect-video'}`}>{preview(item)}</div>
            <div className="p-5 flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-2 text-[11px] text-white/40"><span className="text-white/70 font-medium">{item.model || 'MiniMax H3'}</span><span>·</span><span>{item.quality || item.resolution || 'Local video'}</span>{item.duration&&<><span>·</span><span>{item.duration}s</span></>}<time className="ml-auto" dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</time></div>
              <button className="mt-3 text-sm leading-relaxed text-white/85 text-left line-clamp-3 hover:text-white" onClick={()=>setDetail(item)} aria-label="Open generation details">{item.prompt || 'Prompt unavailable for this older generation.'}</button>
              {!!item.references?.length&&<div className="flex gap-2 mt-3">{item.references.map((ref,i)=><div key={ref.id||i} title={ref.tag || ref.name} className="w-9 h-9 rounded-md overflow-hidden border border-white/10 bg-white/5">{ref.type==='image'?<img alt={ref.tag||'Reference image'} src={ref.url} className="w-full h-full object-cover"/>:<span className="text-[9px] flex items-center justify-center h-full">{ref.type}</span>}</div>)}</div>}
              <div className="mt-auto">{actions(item)}<button className="text-[11px] text-white/35 mt-3 hover:text-white" onClick={()=>setDetail(item)}>View details ↗</button></div>
            </div>
          </article>)}
        </div>
      </section>)}
    </div>
    <dialog ref={dialog} onCancel={()=>setDetail(null)} onClose={()=>setDetail(null)} onClick={e=>{if(e.target===dialog.current)dialog.current.close();}} className="fixed inset-0 m-auto w-[min(1100px,92vw)] max-h-[90vh] rounded-2xl border border-white/15 bg-[#141414] text-white p-0 backdrop:bg-black/80">
      {detail&&<><header className="p-4 border-b border-white/10 flex items-center justify-between"><h2 className="font-semibold text-sm">Generation details</h2><button aria-label="Close generation details" onClick={()=>dialog.current.close()} className={button}><CloseIcon className="w-4 h-4"/></button></header><div className="grid lg:grid-cols-[1.4fr_1fr]"><div className="bg-black flex items-center justify-center">{preview(detail)}</div><div className="p-6 max-h-[70vh] overflow-y-auto"><p className="text-xs text-white/40">{detail.model} · {new Date(detail.createdAt).toLocaleString()}</p><h3 className="mt-6 text-xs text-white/50">{detail.promptSource==='embedded'?'Saved model prompt':'Prompt'}</h3><p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap">{detail.prompt||'The original prompt was not saved.'}</p>{detail.resolution&&<p className="text-xs mt-4 text-white/50">Resolution: {detail.resolution}</p>}{detail.seed!==undefined&&<p className="text-xs mt-2 text-white/50">Seed: {detail.seed}</p>}{actions(detail)}</div></div></>}
    </dialog>
  </main>;
}
