// Local hosting adapter: routes uploads to local storage C:\openhiggs\data\uploads\
// and preserves offline safety for model generation until local models are connected.
export const LOCAL_ENGINE_CONNECTED = false;
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

async function engineNotConnected() {
  throw new Error('Local models are not connected yet. Generation is disabled; no cloud API request was sent.');
}

export const generateImage = engineNotConnected;
export const generateI2I = engineNotConnected;
export const generateVideo = engineNotConnected;
export const generateI2V = engineNotConnected;
export const processLipSync = engineNotConnected;
