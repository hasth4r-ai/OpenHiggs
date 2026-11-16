import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execFileAsync = promisify(execFile);
// A signal also opts out of Next.js request deduplication/stream teeing.
// Otherwise returning at process_completed can wait forever for the unused tee.
const fetch = (url, options = {}) => globalThis.fetch(url, { ...options, cache: 'no-store', signal: options.signal || new AbortController().signal });

// Uncompressed ZIP keeps reference uploads portable, without another dependency.
export function zipFiles(files) {
  const parts = [], central = []; let offset = 0;
  for (const [name, data] of files) {
    const n = Buffer.from(name); let crc = 0xffffffff;
    for (const byte of data) { crc ^= byte; for (let i=0;i<8;i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
    crc = (crc ^ 0xffffffff) >>> 0;
    const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50); h.writeUInt16LE(20,4); h.writeUInt32LE(crc,14); h.writeUInt32LE(data.length,18); h.writeUInt32LE(data.length,22); h.writeUInt16LE(n.length,26);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50); c.writeUInt16LE(20,4); c.writeUInt16LE(20,6); c.writeUInt32LE(crc,16); c.writeUInt32LE(data.length,20); c.writeUInt32LE(data.length,24); c.writeUInt16LE(n.length,28); c.writeUInt32LE(offset,42);
    parts.push(h,n,data); central.push(c,n); offset += h.length+n.length+data.length;
  }
  const directory=Buffer.concat(central), end=Buffer.alloc(22); end.writeUInt32LE(0x06054b50); end.writeUInt16LE(files.length,8); end.writeUInt16LE(files.length,10); end.writeUInt32LE(directory.length,12); end.writeUInt32LE(offset,16);
  return Buffer.concat([...parts,directory,end]);
}

export async function call(base, name, data, session, log=()=>{}) {
  const config=await (await fetch(`${base}/config`)).json();
  const fn=config.dependencies.find(d=>d.api_name===name);
  if(!fn) throw new Error(`Wan2GP endpoint ${name} is unavailable`);
  let index=0;
  const inputs=fn.inputs.map(id=>config.components.find(c=>c.id===id)?.type==='state'?null:data[index++]);
  const response = await fetch(`${base}/gradio_api/queue/join`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:inputs,fn_index:fn.id,session_hash:session,event_data:{},trigger_id:fn.targets?.[0]?.[0]})});
  if (!response.ok) throw new Error(`Wan2GP ${name}: HTTP ${response.status}`);
  const {event_id}=await response.json();
  const stream=await fetch(`${base}/gradio_api/queue/data?session_hash=${session}`);
  if(!stream.ok) throw new Error(`Wan2GP event stream: HTTP ${stream.status}`);
  let buffer=''; const decoder=new TextDecoder();
  for await(const chunk of stream.body) {
    buffer+=decoder.decode(chunk,{stream:true});
    let pos;
    while((pos=buffer.indexOf('\n\n'))>=0) {
      const frame=buffer.slice(0,pos); buffer=buffer.slice(pos+2);
      const raw=frame.match(/^data: (.*)$/m)?.[1];
      if(!raw) continue;
      const value=JSON.parse(raw);
      if(value.event_id && value.event_id!==event_id) continue;
      if(value.msg==='process_completed') {
        if(!value.success) throw new Error(`Wan2GP ${name}: ${value.output?.error || JSON.stringify(value.output)}`);
        return value.output?.data;
      }
      if(value.msg==='log') log({engine:value});
    }
  }
  throw new Error(`Wan2GP ${name} disconnected before completion`);
}

export async function generate({base,wanRoot,wanOutputRoot,uploadsDir,outputDir,ffmpeg,body,control={requested:false}},send,log) {
  const checkCancelled=()=>{if(control.requested)throw Object.assign(new Error('Cancelled by you.'),{name:'AbortError'});};
  checkCancelled();
  const session=randomUUID(), tag=`openhiggs_${session}`;
  const snapshot=async()=>{const r=await fetch(`${base}/deepy/deepy_api/state`); if(!r.ok) throw new Error('Wan2GP shared generation API is unavailable'); return r.json();};
  const initial=await snapshot();
  if(initial.busy || initial.progress) throw new Error('Wan2GP is busy. Wait for its current job to finish.');
  const settings=JSON.parse(await fs.readFile(path.join(wanRoot,'settings','minimax_h3_ref2va_pruned_settings.json'),'utf8'));
  const files=[], refs={image:[],video:[],audio:[]};
  for(const ref of body.references || []) {
    if(!['image','video','audio'].includes(ref.type)) throw new Error('Unsupported reference type');
    const name=decodeURIComponent((ref.url || '').split('/').pop());
    if(!name || name!==path.basename(name) || name.includes('\\')) throw new Error('Invalid reference filename');
    const entry=`media/${files.length}${path.extname(name)}`;
    files.push([entry,await fs.readFile(path.join(uploadsDir,name))]); refs[ref.type].push(entry);
  }
  if(refs.image.length>9 || refs.video.length>3 || refs.audio.length>3 || files.length>12) throw new Error('H3 supports up to 9 images, 3 videos, 3 audio references, and 12 files total.');
  const seconds=Number.parseInt(body.duration) || 5;
  if(seconds<1 || seconds>15) throw new Error('Choose a duration between 1 and 15 seconds.');
  const resolutions={'480p':'832x480','720p':'1280x720','1080p':'1920x1088','2K':'1920x1088'};
  if(!resolutions[body.quality || '480p']) throw new Error('Unsupported resolution');
  Object.assign(settings,{model_type:'minimax_h3_ref2va_pruned',prompt:body.compiledPrompt || body.prompt,resolution:resolutions[body.quality || '480p'],video_length:Math.round(seconds*24/4)*4,force_fps:'24',num_inference_steps:20,batch_size:1,repeat_generation:1,seed:-1,prompt_enhancer:'',activated_loras:[],loras_multipliers:'',output_filename:tag,client_id:session,image_refs:refs.image.length?refs.image:null,video_prompt_type:(refs.image.length?'I':'')+['','V-U','V+-U','V+*-U'][refs.video.length],audio_prompt_type:['','A','AB','ABD'][refs.audio.length]});
  for(const kind of ['video','audio']) for(let i=0;i<3;i++) settings[`${kind}_guide${i?i+1:''}`]=refs[kind][i] || null;
  // A multiline storyboard is one request, never one generation per line.
  settings.multi_prompts_gen_type = 'FG';
  files.unshift(['queue.json',Buffer.from(JSON.stringify([{id:1,params:settings}]))]);
  const form=new FormData();form.append('files',new Blob([zipFiles(files)]),'openhiggs.zip');
  checkCancelled();
  const upload=await fetch(`${base}/gradio_api/upload`,{method:'POST',body:form});
  if(!upload.ok) throw new Error(`Wan2GP upload failed: HTTP ${upload.status}`);
  const [uploaded]=await upload.json();
  log({tag,settings:{...settings,prompt:'[omitted]'}});
  let accepted=false, rejection=''; const loaded=await call(base,'load_queue_action',[{path:uploaded,meta:{_type:'gradio.FileData'}}],session,v=>{
    log(v);
    if(v.engine?.log?.match(/(?:Loaded|Merged) 1 task/))accepted=true;
    if(v.engine?.level==='warning')rejection=v.engine.log;
  });
  log({loaded});
  if(!accepted) throw new Error(rejection || 'Wan2GP did not accept the generation task. See generation log.');
  await call(base,'init_process_queue_if_any',[],session,log);
  let running=true, pollingError=null, sample=null, abortSent=false;
  const polling=(async()=>{
    while(running) {
      try {
        const s=await snapshot(), p=s.progress;
        if(control.requested && p && !abortSent && running) {
          const stopped=await fetch(`${base}/deepy/deepy_api/control`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'abort',payload:{}})});
          if(!stopped.ok)throw new Error('Wan2GP cancellation was not accepted. Retrying…');
          abortSent=true;
        }
        if(p) {
          const d=p.type==='progress'?p.data:[], position=d[0], phase=p.description || 'Working';
          const step=Array.isArray(position)?Number(position[0]):0, total=Array.isArray(position)?Number(position[1]):0;
          const pct=total?100*step/total:typeof position==='number'?100*position:0;
          let eta=null;
          if(total && step>0 && /denois|sampling/i.test(phase)) {
            if(!sample || sample.total!==total || step<sample.step) sample={step,total,time:Date.now()};
            else if(step>sample.step) eta=Math.max(0,(Date.now()-sample.time)/1000/(step-sample.step)*(total-step));
          } else sample=null;
          send({type:'progress',pct:Math.max(0,Math.min(100,pct)),step,total,phase:control.requested?'Cancelling…':phase,eta:control.requested?null:eta});
        }
      } catch(e) {pollingError=e.message;}
      await new Promise(r=>setTimeout(r,1000));
    }
  })();
  try { await call(base,'process_tasks_1',[],session,log); }
  finally {running=false;await polling;}
  checkCancelled();
  const outputRoot = wanOutputRoot || wanRoot;
  const config=JSON.parse(await fs.readFile(path.join(outputRoot,'wgp_config.json'),'utf8'));
  const root=path.resolve(outputRoot,config.save_path || 'outputs');
  async function find(dir) { for(const e of await fs.readdir(dir,{withFileTypes:true})) {const p=path.join(dir,e.name);if(e.isDirectory()){const found=await find(p);if(found)return found;}else if(e.name.startsWith(tag)&&/\.(mp4|mov|webm|mkv)$/i.test(e.name))return p;} }
  const result=await find(root);
  if(!result) throw new Error(`Wan2GP finished without a video. ${pollingError || 'Check the Wan2GP generation log for the engine error.'}`);
  await fs.mkdir(outputDir,{recursive:true}); const name=`${tag}.mp4`;
  send({type:'progress',pct:0,phase:'Preparing browser video',step:0,total:0,eta:null});
  checkCancelled();
  const partial=path.join(outputDir,`${tag}.partial`);
  try {
    await execFileAsync(ffmpeg,['-nostdin','-y','-i',result,'-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-movflags','+faststart','-f','mp4',partial],{windowsHide:true});
    checkCancelled();
    await fs.rename(partial,path.join(outputDir,name));
  } finally {await fs.unlink(partial).catch(()=>{});}
  send({type:'done',videoUrl:`/api/generations/${encodeURIComponent(name)}`,fileName:name});
}

export async function generateImage({base,wanRoot,wanOutputRoot,uploadsDir,outputDir,body,control={requested:false}},send=()=>{},log=()=>{}) {
  const checkCancelled=()=>{if(control.requested)throw Object.assign(new Error('Cancelled by you.'),{name:'AbortError'});};
  checkCancelled();
  const session=randomUUID(), tag=`openhiggs_img_${session}`;
  const snapshot=async()=>{const r=await fetch(`${base}/deepy/deepy_api/state`); if(!r.ok) throw new Error('Wan2GP shared generation API is unavailable'); return r.json();};
  const initial=await snapshot();
  if(initial.busy || initial.progress) throw new Error('Wan2GP is busy. Wait for its current job to finish.');

  const isMiniMax = body.model ? String(body.model).toLowerCase().includes('minimax') : true;
  const settingsFile = isMiniMax ? 'minimax_h3_ref2va_pruned_settings.json' : 'ming_image_0_1_design_settings.json';
  const defaultModelType = isMiniMax ? 'minimax_h3_ref2va_pruned' : 'ming_image_0_1_design';

  const settings=JSON.parse(await fs.readFile(path.join(wanRoot,'settings',settingsFile),'utf8'));
  const files=[];

  // Packaging references for multi-ref / conditioning
  const refs = [];
  const referenceUrls = body.image_urls || (body.references ? body.references.map(r => r.url) : []);
  for (const refUrl of referenceUrls) {
    const name = decodeURIComponent((refUrl || '').split('/').pop());
    if (name) {
      const entry = `media/${files.length}${path.extname(name)}`;
      try {
        files.push([entry, await fs.readFile(path.join(uploadsDir, name))]);
        refs.push(entry);
      } catch {}
    }
  }

  // Packaging inpaint source and mask if provided
  const isInpaint = Boolean(body.source && body.mask);
  if (body.source) {
    const name = decodeURIComponent(body.source.split('/').pop());
    if (name) {
      const entry = `media/source${path.extname(name)}`;
      try {
        files.push([entry, await fs.readFile(path.join(uploadsDir, name))]);
        settings.image_guide = entry;
        settings.video_guide = entry;
      } catch {}
    }
  }
  if (body.mask) {
    const name = decodeURIComponent(body.mask.split('/').pop());
    if (name) {
      const entry = `media/mask${path.extname(name)}`;
      try {
        files.push([entry, await fs.readFile(path.join(uploadsDir, name))]);
        settings.image_mask = entry;
        settings.video_mask = entry;
      } catch {}
    }
  }

  let targetRes = '1024x1024';
  const ar = body.aspect_ratio || body.ar || '1:1';
  if (ar === '16:9') targetRes = '1280x720';
  else if (ar === '9:16') targetRes = '720x1280';
  else if (ar === '4:3') targetRes = '1024x768';
  else if (ar === '3:4') targetRes = '768x1024';
  else if (ar === '3:2') targetRes = '1152x768';
  else if (ar === '2:3') targetRes = '768x1152';
  else if (ar === '21:9') targetRes = '1280x550';
  else targetRes = '1024x1024';

  const batchCount = Math.max(1, Math.min(4, Number(body.batch_size || body.batchCount || 1)));

  const videoPromptType = isInpaint
    ? (refs.length ? 'GMVAI' : 'GMVA')
    : (refs.length ? 'I' : '');

  const imageMode = isInpaint ? 2 : 1;

  settings.multi_prompts_gen_type = 'FG';
  Object.assign(settings, {
    model_type: defaultModelType,
    image_mode: imageMode,
    prompt: body.compiledPrompt || body.prompt,
    resolution: targetRes,
    num_inference_steps: Number(body.steps) || (isMiniMax ? 8 : 12),
    batch_size: 1,
    repeat_generation: 1,
    seed: Number(body.seed) >= 0 ? Number(body.seed) : -1,
    output_filename: tag,
    client_id: session,
    image_refs: refs.length ? refs : null,
    video_prompt_type: videoPromptType,
    denoising_strength: isInpaint ? Number(body.denoise ?? (body.editMode === 'replace' ? 0.95 : 0.85)) : 1.0,
    masking_strength: 1,
    mask_expand: Number(body.mask_expand ?? 16),
    custom_settings: {
      ...(settings.custom_settings || {}),
      h3_mask_mode: 'shared_timestep'
    }
  });

  const queueTasks = [];
  for (let i = 0; i < batchCount; i++) {
    queueTasks.push({
      id: i + 1,
      params: {
        ...settings,
        batch_size: 1,
        repeat_generation: 1,
        seed: Number(body.seed) >= 0 ? (Number(body.seed) + i) : -1,
        output_filename: batchCount === 1 ? tag : `${tag}_${i + 1}`
      }
    });
  }

  files.unshift(['queue.json', Buffer.from(JSON.stringify(queueTasks))]);
  const form=new FormData();
  form.append('files', new Blob([zipFiles(files)]), 'openhiggs.zip');
  checkCancelled();

  const upload=await fetch(`${base}/gradio_api/upload`, { method: 'POST', body: form });
  if(!upload.ok) throw new Error(`Wan2GP upload failed: HTTP ${upload.status}`);
  const [uploaded]=await upload.json();

  let accepted=false, rejection='';
  await call(base, 'load_queue_action', [{ path: uploaded, meta: { _type: 'gradio.FileData' } }], session, v => {
    log?.(v);
    if(v.engine?.log?.match(/(?:Loaded|Merged) \d+ task/)) accepted = true;
    if(v.engine?.level === 'warning') rejection = v.engine.log;
  });

  if(!accepted) throw new Error(rejection || 'Wan2GP did not accept the image generation task.');
  await call(base, 'init_process_queue_if_any', [], session, log);

  let running=true, pollingError=null, sample=null, abortSent=false;
  const polling=(async () => {
    while(running) {
      try {
        const s=await snapshot(), p=s.progress;
        if(control.requested && p && !abortSent && running) {
          const stopped=await fetch(`${base}/deepy/deepy_api/control`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'abort', payload: {} }) });
          if(!stopped.ok) throw new Error('Wan2GP cancellation was not accepted. Retrying…');
          abortSent = true;
        }
        if(p) {
          const d=p.type==='progress'?p.data:[], position=d[0], phase=p.description || 'Sampling Image';
          const step=Array.isArray(position) ? Number(position[0]) : 0, total=Array.isArray(position) ? Number(position[1]) : 0;
          const pct=total ? 100 * step / total : typeof position === 'number' ? 100 * position : 0;
          let eta=null;
          if(total && step > 0 && /denois|sampling/i.test(phase)) {
            if(!sample || sample.total !== total || step < sample.step) sample = { step, total, time: Date.now() };
            else if(step > sample.step) eta = Math.max(0, (Date.now() - sample.time) / 1000 / (step - sample.step) * (total - step));
          } else sample = null;
          send?.({ type: 'progress', pct: Math.max(0, Math.min(100, pct)), step, total, phase: control.requested ? 'Cancelling…' : phase, eta: control.requested ? null : eta });
        }
      } catch(e) { pollingError = e.message; }
      await new Promise(r => setTimeout(r, 1000));
    }
  })();

  try { await call(base, 'process_tasks_1', [], session, log); }
  finally { running = false; await polling; }
  checkCancelled();

  const outputRoot = wanOutputRoot || wanRoot;
  const config=JSON.parse(await fs.readFile(path.join(outputRoot, 'wgp_config.json'), 'utf8'));
  const rootDir=path.resolve(outputRoot, config.save_path || 'outputs');
  async function findAll(dir) {
    let found = [];
    for(const e of await fs.readdir(dir, { withFileTypes: true }).catch(() => [])) {
      const p = path.join(dir, e.name);
      if(e.isDirectory()) {
        const sub = await findAll(p);
        found = found.concat(sub);
      } else if(e.name.startsWith(tag) && /\.(png|jpg|jpeg|webp)$/i.test(e.name)) {
        found.push(p);
      }
    }
    return found;
  }

  const matches = await findAll(rootDir);
  if(!matches.length) throw new Error(`Wan2GP finished without an output image. ${pollingError || 'Check Wan2GP log.'}`);

  matches.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  await fs.mkdir(outputDir, { recursive: true });
  const results = [];
  for (let idx = 0; idx < matches.length; idx++) {
    const src = matches[idx];
    const ext = path.extname(src);
    const outName = matches.length === 1 ? `${tag}${ext}` : `${tag}_${idx + 1}${ext}`;
    const destPath = path.join(outputDir, outName);
    await fs.copyFile(src, destPath);
    results.push({
      imageUrl: `/api/generations/${encodeURIComponent(outName)}`,
      fileName: outName
    });
  }

  send?.({
    type: 'done',
    imageUrl: results[0]?.imageUrl,
    fileName: results[0]?.fileName,
    results
  });
  return {
    results,
    imageUrl: results[0]?.imageUrl,
    fileName: results[0]?.fileName
  };
}
