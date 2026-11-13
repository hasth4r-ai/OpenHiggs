// Local hosting phase: expose the studio without enabling a cloud backend.
// Replace these operations with the local model adapter in the integration phase.
export const LOCAL_ENGINE_CONNECTED = false;

async function engineNotConnected() {
  throw new Error('Local models are not connected yet. Uploads and generation are disabled; no cloud API request was sent.');
}

export const generateImage = engineNotConnected;
export const generateI2I = engineNotConnected;
export const generateVideo = engineNotConnected;
export const generateI2V = engineNotConnected;
export const processLipSync = engineNotConnected;
export const uploadFile = engineNotConnected;
