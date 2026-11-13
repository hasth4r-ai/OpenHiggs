import {activeTasks} from './generation-history.mjs';
export function acquireGeneration(id) {
  if(globalThis.openHiggsSubmission || activeTasks.size)return false;
  globalThis.openHiggsSubmission=id;return true;
}
export function releaseGeneration(id) {if(globalThis.openHiggsSubmission===id)globalThis.openHiggsSubmission=null;}
