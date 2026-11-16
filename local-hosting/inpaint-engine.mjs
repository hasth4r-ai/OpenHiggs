import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {call,zipFiles} from './wan-client.mjs';
import {uploadedPath,probeVideo,validatePair,normalizeMask,compositeProRes,exportProResMaster,makePreview,PRORES} from './inpaint-media.mjs';
import {inpaintSettings} from './inpaint-settings.mjs';
// CPU preparation can outlive Gradio's keep-alive timeout. Use fresh connections
// and retry only read-only probes, never task submissions.
const request=async(url,options={})=>{
  for(let attempt=0;;attempt++)try{
    return await fetch(url,{...options,headers:{...options.headers,Connection:'close'},cache:'no-store',signal:options.signal||new AbortController().signal});
  }catch(error){
    if((options.method||'GET')==='GET'&&attempt===0&&['ECONNRESET','UND_ERR_SOCKET','EPIPE'].includes(error.cause?.code))continue;
    throw new Error('Wan2GP '+new URL(url).pathname+': '+(error.cause?.message||error.message),{cause:error});
  }
};
export async function runInpaint({base,wanRoot,wanOutputRoot,uploadsDir,outputDir,ffmpeg,body,control},send,log) {
  const session=randomUUID(),tag=`inpaint_${session}`,check=()=>{if(control.requested)throw Object.assign(new Error('Cancelled by you.'),{name:'AbortError'});};
  const snapshot=async()=>{const r=await request(`${base}/deepy/deepy_api/state`);if(!r.ok)throw new Error('Wan2GP is not reachable.');return r.json();};
  let initial=await snapshot();
  if(initial.busy||initial.progress) {
    send({type:'progress',pct:0,phase:'Queued · Waiting for GPU to become free…',step:0,total:0,eta:null});
    while(initial.busy||initial.progress) {
      check();
      await new Promise(r=>setTimeout(r,2000));
      initial=await snapshot();
    }
  }
  if(!PRORES[body.profile||'422hq'])throw new Error('Choose a supported ProRes profile.');
  const source=await uploadedPath(uploadsDir,body.source),mask=await uploadedPath(uploadsDir,body.mask);
  const reference=body.reference?await uploadedPath(uploadsDir,body.reference,'image'):null;
  const info=await probeVideo(ffmpeg,source),maskInfo=await probeVideo(ffmpeg,mask);validatePair(info,maskInfo);
  const bytes=(await fs.stat(source)).size+(await fs.stat(mask)).size+(reference?(await fs.stat(reference)).size:0);
  if(bytes>512*1024*1024)throw new Error('Source, mask and reference must total under 512 MB. Trim the shot or use smaller inputs.');
  const isWan21 = !body.model || body.model === 'wan21' || body.model === 'vace_14B_fusionix';
  const defaultsFile = isWan21
    ? path.join(wanRoot, 'settings', 'vace_14B_fusionix_settings.json')
    : path.join(wanRoot, 'settings', 'minimax_h3_ref2va_pruned_settings.json');
  const presetFile = isWan21
    ? path.join(wanRoot, 'loras', 'wan', 'VideoInpaint_Wan2.1_Vance14B_FusioniX.json')
    : path.join(wanRoot, 'loras', 'minimax_h3', 'Minimaxh3_VideoInpaintRef2VA.json');
  const defaults = JSON.parse(await fs.readFile(defaultsFile, 'utf8'));
  const preset = JSON.parse(await fs.readFile(presetFile, 'utf8'));
  const settings = inpaintSettings(defaults, preset, {...body, model: isWan21 ? 'wan21' : 'minimax_h3', sourceExtension: path.extname(source), referenceExtension: reference ? path.extname(reference) : ''}, info, session);
  const temporary=path.resolve(outputDir,'..','..','temp',tag);await fs.mkdir(temporary,{recursive:true});
  const normalized=path.join(temporary,'mask.mkv');
  const phase=message=>send({type:'progress',pct:0,phase:message,step:0,total:0,eta:null});
  check();phase('Validating and preparing mask');
  await normalizeMask({ffmpeg,input:mask,output:normalized,info,invert:!!body.invert,expand:Number(body.expand||0)});
  check();
  const files=[['queue.json',Buffer.from(JSON.stringify([{id:1,params:settings}]))],[settings.video_guide,await fs.readFile(source)],['mask.mkv',await fs.readFile(normalized)]];
  if(reference)files.push([settings.image_refs[0],await fs.readFile(reference)]);
  const form=new FormData();form.append('files',new Blob([zipFiles(files)]),'inpaint.zip');
  phase('Submitting inpaint task');check();
  // Recheck after CPU preparation, before adding anything to the shared queue.
  let current=await snapshot();
  while(current.busy||current.progress) {
    check();
    await new Promise(r=>setTimeout(r,2000));
    current=await snapshot();
  }
  const uploaded=await request(`${base}/gradio_api/upload`,{method:'POST',body:form});if(!uploaded.ok)throw new Error('Could not upload inpaint task to Wan2GP.');
  const [file]=await uploaded.json();let accepted=false,rejection='';
  await call(base,'load_queue_action',[{path:file,meta:{_type:'gradio.FileData'}}],session,event=>{log(event);if(/(?:Loaded|Merged) 1 task/.test(event.engine?.log||''))accepted=true;if(event.engine?.level==='warning')rejection=event.engine.log;});
  if(!accepted)throw new Error(rejection||'Wan2GP rejected the inpaint task.');
  await call(base,'init_process_queue_if_any',[],session,log);
  let running=true,aborted=false,sample=null;
  const poll=(async()=>{while(running){try{
    const s=await snapshot(),p=s.progress;
    if(p&&control.requested&&!aborted&&running){const r=await request(`${base}/deepy/deepy_api/control`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'abort',payload:{}})});if(r.ok)aborted=true;}
    if(p){const d=p.type==='progress'?p.data:[],pos=d[0],step=Array.isArray(pos)?Number(pos[0]):0,total=Array.isArray(pos)?Number(pos[1]):0,pct=total?100*step/total:typeof pos==='number'?100*pos:0;let eta=null;
      if(total&&step>0&&/denois|sampling/i.test(p.description)){if(!sample||step<sample.step||sample.total!==total)sample={step,total,time:Date.now()};else if(step>sample.step)eta=(Date.now()-sample.time)/1000/(step-sample.step)*(total-step);}else sample=null;
      send({type:'progress',pct:Math.max(0,Math.min(100,pct)),step,total,phase:control.requested?'Cancelling…':p.description,eta:control.requested?null:eta});}
  }catch(e){log({pollError:e.message});}await new Promise(r=>setTimeout(r,1000));}})();
  try{await call(base,'process_tasks_1',[],session,log);}finally{running=false;await poll;}check();
  const outputRoot = wanOutputRoot || wanRoot;
  const config=JSON.parse(await fs.readFile(path.join(outputRoot,'wgp_config.json'),'utf8'));
  async function find(dir){for(const entry of await fs.readdir(dir,{withFileTypes:true})){const full=path.join(dir,entry.name);if(entry.isDirectory()){const found=await find(full);if(found)return found;}else if(entry.name.startsWith(tag)&&/\.(mov|mp4|mkv|webm)$/i.test(entry.name))return full;}}
  const generated=await find(path.resolve(outputRoot,config.save_path||'outputs'));if(!generated)throw new Error('Wan2GP did not produce an edited video. Inspect its generation log.');
  const generatedInfo=await probeVideo(ffmpeg,generated);
  if(generatedInfo.frames < Math.min(info.frames - 2, 16) || Math.abs(generatedInfo.fps - info.fps) > 0.5)throw new Error('The model output does not match the source timeline. Original footage was preserved; no misaligned composite was exported.');
  phase('Exporting master ProRes and preview');
  const mov=path.join(temporary,'master.mov'),preview=path.join(temporary,'preview.mp4');
  const abortController=new AbortController();const timer=setInterval(()=>{if(control.requested)abortController.abort();},250);
  try {
    await exportProResMaster({ffmpeg,source,generated,output:mov,info,profile:body.profile||'422hq',keepAudio:body.keepAudio!==false,signal:abortController.signal});check();
    phase('Preparing MP4 preview');await makePreview({ffmpeg,input:mov,output:preview,signal:abortController.signal});check();
    const finalInfo=await probeVideo(ffmpeg,mov);if(finalInfo.frames!==info.frames||finalInfo.width!==info.width||finalInfo.height!==info.height)throw new Error('Export validation failed. The original footage is unchanged.');
    await fs.mkdir(outputDir,{recursive:true});await fs.rename(mov,path.join(outputDir,tag+'.mov'));await fs.rename(preview,path.join(outputDir,tag+'.mp4'));
    send({type:'done',videoUrl:`/api/generations/${tag}.mp4`,fileName:tag+'.mp4',originalUrl:`/api/generations/${tag}.mov`,originalFileName:tag+'.mov',resolution:`${info.width}×${info.height}`,duration:info.duration,fps:info.fps});
  }finally{clearInterval(timer);}
  // Only remove this job's known intermediate files. Keep Wan2GP's original output.
  await fs.unlink(normalized).catch(()=>{});await fs.rmdir(temporary).catch(()=>{});
}
