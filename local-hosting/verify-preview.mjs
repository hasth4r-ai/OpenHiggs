import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const root = process.argv[2];
const source = await fs.readFile(path.join(root, 'packages/studio/src/local.js'), 'utf8');
const originalFetch = globalThis.fetch;
const originalXHR = globalThis.XMLHttpRequest;
let requests = 0;
globalThis.fetch = async () => { requests++; throw new Error('Unexpected network request'); };
globalThis.XMLHttpRequest = class { constructor() { requests++; throw new Error('Unexpected upload request'); } };
try {
  const client = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
  assert.equal(client.LOCAL_ENGINE_CONNECTED, false);
  for (const key of [null, 'stale-key-from-an-earlier-session']) {
    for (const operation of ['generateImage', 'generateI2I', 'generateVideo', 'generateI2V', 'processLipSync', 'uploadFile']) {
      await assert.rejects(client[operation](key, {prompt:'test', model:'veo3'}), /Local models are not connected/);
    }
  }
  assert.equal(requests, 0);
  for (const name of ['ImageStudio', 'VideoStudio', 'LipSyncStudio', 'CinemaStudio']) {
    const component = await fs.readFile(path.join(root, 'packages/studio/src/components', name + '.jsx'), 'utf8');
    assert(!component.includes('../kie.js'), `${name} still imports the cloud client`);
    assert(component.includes('../local.js'), `${name} does not import the local client`);
  }
  console.log('PASS: all six operations reject with and without a stale key; zero network requests. All four studios use the local adapter.');
} finally {
  globalThis.fetch = originalFetch;
  globalThis.XMLHttpRequest = originalXHR;
}
