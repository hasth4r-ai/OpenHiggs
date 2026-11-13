import fs from 'node:fs/promises';
import path from 'node:path';
import { generate } from '../../../local-hosting/wan-client.mjs';

export const runtime = 'nodejs';
let active = false;

export async function POST(request) {
  if(active) return Response.json({error:'A generation is already running.'},{status:409});
  let body;
  try {body=await request.json(); if(!String(body.compiledPrompt || body.prompt || '').trim()) throw new Error('Enter a prompt.');}
  catch(e){return Response.json({error:e.message},{status:400});}
  active=true;
  let connected=true;
  const stream=new ReadableStream({
    start(controller) {
      const encoder=new TextEncoder();
      const send=data=>{if(connected) try{controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));}catch{connected=false;}};
      const root=path.resolve(process.cwd(),'..');
      const logPath=path.join(root,'logs',`generation_${Date.now()}.jsonl`);
      let writes=Promise.resolve();
      const log=value=>{writes=writes.then(()=>fs.appendFile(logPath,JSON.stringify({time:new Date().toISOString(),...value})+'\n')).catch(console.error);};
      (async()=>{
        try {
          const config=JSON.parse((await fs.readFile(path.join(root,'config','wan-engine.json'),'utf8')).replace(/^\uFEFF/,''));
          send({type:'start',message:'Connecting to running Wan2GP...'});
          await generate({base:config.baseUrl,wanRoot:config.wanRoot,ffmpeg:config.ffmpeg,uploadsDir:path.join(root,'data','uploads'),outputDir:path.join(root,'data','generations'),body},data=>{if(data.type!=='progress')log(data);send(data);},log);
        } catch(e) {log({error:e.stack});send({type:'error',message:e.message});}
        finally {await writes;active=false;if(connected){connected=false;controller.close();}}
      })();
    },
    cancel(){connected=false;},
  });
  return new Response(stream,{headers:{'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','X-Accel-Buffering':'no'}});
}
