import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {uploadedPath,makeInputPreview} from '../../../../local-hosting/inpaint-media.mjs';
export const runtime='nodejs';
const jobs=globalThis.inpaintPreviewJobs??=new Map();
export async function POST(request) {
  try {
    const {url}=await request.json(),root=path.resolve(process.cwd(),'..'),uploads=path.join(root,'data','uploads');
    const input=await uploadedPath(uploads,url),stat=await fs.stat(input);
    const name='preview_'+createHash('sha256').update(input+stat.size+stat.mtimeMs).digest('hex').slice(0,24)+'.mp4',output=path.join(uploads,name);
    try {await fs.access(output);}catch {
      if(!jobs.has(output)){
        const job=(async()=>{
          const config=JSON.parse((await fs.readFile(path.join(root,'config','wan-engine.json'),'utf8')).replace(/^\uFEFF/,''));
          const temporary=output+'.'+randomUUID()+'.tmp.mp4';
          try {await makeInputPreview({ffmpeg:config.ffmpeg,input,output:temporary});await fs.rename(temporary,output);}finally {await fs.rm(temporary,{force:true});}
        })().finally(()=>jobs.delete(output));jobs.set(output,job);
      }
      await jobs.get(output);
    }
    return Response.json({url:'/api/media/'+name});
  }catch(error){return Response.json({error:'Preview unavailable: '+error.message},{status:400});}
}
