import {acquireGeneration,releaseGeneration} from '../../../local-hosting/generation-lock.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { runInpaint } from '../../../local-hosting/inpaint-engine.mjs';
import {randomUUID} from 'node:crypto';
import {saveGeneration,runId,activeTasks} from '../../../local-hosting/generation-history.mjs';
import {getInstallRoot} from '../../../local-hosting/root.mjs';

export const runtime = 'nodejs';
let active = false;

export async function POST(request) {
  if(active) return Response.json({error:'A generation is already running.'},{status:409});
  let body;
  try {body=await request.json(); if(!body.source||!body.mask)throw new Error('Upload source and mask videos.'); if(!String(body.prompt || '').trim()) throw new Error('Enter a prompt.');}
  catch(e){return Response.json({error:e.message},{status:400});}
  if(active) return Response.json({error:'A generation is already running.'},{status:409});
  active=true;
  const modelName = (!body.model || body.model === 'wan21' || body.model === 'vace_14B_fusionix')
    ? 'Wan 2.1 (Vace 14B FusioniX)'
    : 'MiniMax H3 Inpaint';
  const record={id:randomUUID(),runId,createdAt:new Date().toISOString(),status:'generating',model:modelName,workflow:'inpaint',inpaintRequest:body,prompt:body.prompt || '',compiledPrompt:body.compiledPrompt || '',references:body.references || [],duration:body.duration,quality:body.quality,preset:body.preset || 'general',aspectRatio:body.aspectRatio || 'Auto',progress:0,phase:'Connecting to Wan2GP',eta:null};
  if(!acquireGeneration(record.id)){active=false;return Response.json({error:'Another local generation is running. Wait for it to finish.'},{status:409});}
  try {await saveGeneration(record);} catch(e){releaseGeneration(record.id);active=false;return Response.json({error:'Could not save generation history. Check available disk space.'},{status:500});}
  let connected=true;
  const stream=new ReadableStream({
    start(controller) {
      const encoder=new TextEncoder();
      const send=data=>{if(connected) try{controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));}catch{connected=false;}};
      const root=getInstallRoot();
      const logPath=path.join(root,'logs',`generation_${Date.now()}.jsonl`);
      let writes=Promise.resolve();
      let historyWrites=Promise.resolve();
      const persist=()=>{const snapshot={...record};historyWrites=historyWrites.then(()=>saveGeneration(snapshot)).catch(e=>console.error('History save failed',e));};
      const control={requested:false,finished:false,onCancel:async()=>{
        Object.assign(record,{cancelRequested:true,phase:'Cancelling…',eta:null});persist();await historyWrites;
      }};
      activeTasks.set(record.id,control);
      const log=value=>{writes=writes.then(()=>fs.appendFile(logPath,JSON.stringify({time:new Date().toISOString(),...value})+'\n')).catch(console.error);};
      (async()=>{
        try {
          const config=JSON.parse((await fs.readFile(path.join(root,'config','wan-engine.json'),'utf8')).replace(/^\uFEFF/,''));
          send({type:'start',message:'Connecting to running Wan2GP...'});
          await runInpaint({base:config.baseUrl,wanRoot:config.wanRoot,wanOutputRoot:config.wanOutputRoot,ffmpeg:config.ffmpeg,uploadsDir:path.join(root,'data','uploads'),outputDir:path.join(root,'data','generations'),body,control},data=>{
            if(data.type==='progress') Object.assign(record,{progress:data.pct,phase:data.phase,eta:data.eta,step:data.step,total:data.total});
            if(data.type==='done') Object.assign(record,{status:'completed',progress:100,videoUrl:data.videoUrl,fileName:data.fileName,originalUrl:data.originalUrl,originalFileName:data.originalFileName,resolution:data.resolution,duration:data.duration,fps:data.fps,completedAt:new Date().toISOString()});
            if(data.type==='done')control.finished=true;
            if(control.requested && !control.finished){record.phase='Cancelling…';record.eta=null;}
            persist();if(data.type!=='progress')log(data);send(data);
          },log);
        } catch(e) {const cancelled=e.name==='AbortError';Object.assign(record,{status:cancelled?'cancelled':'failed',phase:cancelled?'Cancelled':'Failed',eta:null,error:cancelled?'Cancelled by you.':e.message,completedAt:new Date().toISOString()});persist();log({error:e.stack});send({type:cancelled?'cancelled':'error',message:record.error});}
        finally {control.finished=true;await Promise.all([writes,historyWrites]);activeTasks.delete(record.id);releaseGeneration(record.id);active=false;if(connected){connected=false;controller.close();}}
      })();
    },
    cancel(){connected=false;},
  });
  return new Response(stream,{headers:{'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','X-Accel-Buffering':'no'}});
}
