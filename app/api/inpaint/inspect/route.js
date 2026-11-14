import fs from 'node:fs/promises';
import path from 'node:path';
import {uploadedPath,probeVideo,validatePair} from '../../../../local-hosting/inpaint-media.mjs';
import {getInstallRoot} from '../../../../local-hosting/root.mjs';
export const runtime='nodejs';
export async function POST(request) {
  try {
    const body=await request.json(),root=getInstallRoot();
    const config=JSON.parse((await fs.readFile(path.join(root,'config','wan-engine.json'),'utf8')).replace(/^\uFEFF/,''));
    const source=await probeVideo(config.ffmpeg,await uploadedPath(path.join(root,'data','uploads'),body.source));
    if(body.mask){const mask=await probeVideo(config.ffmpeg,await uploadedPath(path.join(root,'data','uploads'),body.mask));validatePair(source,mask);}
    return Response.json({source,aligned:!!body.mask});
  }catch(error){return Response.json({error:error.message},{status:400});}
}
