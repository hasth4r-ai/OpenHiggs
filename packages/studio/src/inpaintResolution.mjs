export function processingSize(info,choice='720') {
  if(!['480','720','1080','source'].includes(String(choice)))throw new Error('Choose a supported processing resolution.');
  if(choice==='source')return {width:info.width,height:info.height};
  const scale=Math.min(1,Number(choice)/Math.min(info.width,info.height));
  return {width:Math.max(32,Math.round(info.width*scale/32)*32),height:Math.max(32,Math.round(info.height*scale/32)*32)};
}
