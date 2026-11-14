import {listGenerations} from '../../../local-hosting/generation-history.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET() {
  try {
    const items = await listGenerations();
    console.log('[API /api/history] Result items count:', items.length);
    return Response.json({items},{headers:{'Cache-Control':'no-store'}});
  }
  catch(error){console.error('[API /api/history] Error:', error);return Response.json({error:'Could not read generation history.'},{status:500});}
}
