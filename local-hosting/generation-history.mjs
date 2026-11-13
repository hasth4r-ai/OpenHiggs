import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

globalThis.openHiggsRunId ||= randomUUID();
export const runId = globalThis.openHiggsRunId;
export function historyDirectory() {return path.resolve(process.cwd(),'..','data','database','generation-history');}
export async function saveGeneration(record) {
  const dir=historyDirectory(); await fs.mkdir(dir,{recursive:true});
  const target=path.join(dir,`${record.id}.json`), temp=`${target}.${randomUUID()}.tmp`;
  await fs.writeFile(temp,JSON.stringify(record,null,2)); await fs.rename(temp,target);
}
export async function listGenerations() {
  const dir=historyDirectory(); await fs.mkdir(dir,{recursive:true});
  const entries=await fs.readdir(dir);
  const records=await Promise.all(entries.filter(n=>n.endsWith('.json')).map(async n=>{
    const record=JSON.parse(await fs.readFile(path.join(dir,n),'utf8'));
    if(record.status==='generating' && record.runId!==runId) return {...record,status:'interrupted',error:'OpenHiggs restarted before this job finished. Check Wan2GP before retrying.'};
    return record;
  }));
  const known=new Set(records.map(r=>r.fileName));
  const outputs=path.resolve(process.cwd(),'..','data','generations');
  for(const name of await fs.readdir(outputs)) {
    if(!/\.mp4$/i.test(name)||known.has(name)) continue;
    const stat=await fs.stat(path.join(outputs,name));
    records.push({id:name,fileName:name,videoUrl:`/api/generations/${encodeURIComponent(name)}`,createdAt:stat.mtime.toISOString(),status:'completed',prompt:'',model:'MiniMax H3',references:[]});
  }
  return records.sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt));
}
