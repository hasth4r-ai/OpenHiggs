// Local hosting adapter: routes uploads to local storage C:\openhiggs\data\uploads\
// and preserves offline safety for model generation.
export const LOCAL_ENGINE_CONNECTED = true;
export const LOCAL_UPLOADS_ENABLED = true;

const localUploadMap = new Map();

export function getLocalPath(fileUrl) {
  return localUploadMap.get(fileUrl) || (typeof window !== 'undefined' && window.__localUploadMap ? window.__localUploadMap[fileUrl] : null);
}

export function uploadFile(apiKey, file, onProgress) {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload');

    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          if (res.code && res.code !== 200) {
            reject(new Error(res.msg || `Upload error: ${res.code}`));
            return;
          }
          const fileUrl = res.data?.fileUrl || res.data?.url;
          const localPath = res.data?.localPath;
          if (fileUrl && localPath) {
            localUploadMap.set(fileUrl, localPath);
            if (typeof window !== 'undefined') {
              window.__localUploadMap = window.__localUploadMap || {};
              window.__localUploadMap[fileUrl] = localPath;
            }
          }
          resolve(fileUrl);
        } catch (e) {
          reject(new Error('Failed to parse upload response'));
        }
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Local upload failed (network error)'));
    };

    xhr.send(formData);
  });
}

export async function generateImage(apiKey, params) {
  const res = await fetch('/api/image/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Image generation failed with status ${res.status}`);
  }
  return await res.json();
}

export async function generateI2I(apiKey, params) {
  const res = await fetch('/api/image/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...params, mode: 'i2i' })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Image editing failed with status ${res.status}`);
  }
  return await res.json();
}

async function engineNotConnected() {
  throw new Error('Local video/audio models are being routed through the dedicated video and audio tabs.');
}

export const generateVideo = engineNotConnected;
export const generateI2V = engineNotConnected;
export const processLipSync = engineNotConnected;
