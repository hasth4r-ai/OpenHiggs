import {activeTasks,listGenerations,saveGeneration} from '../../../local-hosting/generation-history.mjs';
export const runtime='nodejs';
export async function POST(request) {
  try {
    const {id,action}=await request.json();
    const record=(await listGenerations({includeDeleted:action==='restore'})).find(r=>r.id===id);
    if(!record)return Response.json({error:'History entry not found.'},{status:404});
    if(action==='cancel') {
      const task=activeTasks.get(id);
      if(record.status!=='generating'||!task||task.finished)return Response.json({error:'This task is no longer running in OpenHiggs. Refresh history.'},{status:409});
      task.requested=true;
      await task.onCancel();
      return Response.json({ok:true});
    }
    if(action==='restore') {
      await saveGeneration({...record,deletedAt:null});
      return Response.json({ok:true});
    }
    if(action==='delete') {
      if(record.status==='generating'||activeTasks.has(id))return Response.json({error:'Cancel the task and wait for it to stop before deleting it.'},{status:409});
      await saveGeneration({...record,deletedAt:new Date().toISOString()});
      return Response.json({ok:true});
    }
    return Response.json({error:'Unknown action.'},{status:400});
  }catch(error){return Response.json({error:error.message},{status:500});}
}
