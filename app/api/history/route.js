import {listGenerations} from '../../../local-hosting/generation-history.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET() {
  try {return Response.json({items:await listGenerations()},{headers:{'Cache-Control':'no-store'}});}
  catch(error){console.error(error);return Response.json({error:'Could not read generation history.'},{status:500});}
}
