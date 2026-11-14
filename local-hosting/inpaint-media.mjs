import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

const exec = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const PRORES = {
  '422': {profile: 2, pixel: 'yuv422p10le'},
  '422hq': {profile: 3, pixel: 'yuv422p10le'},
  '4444': {profile: 4, pixel: 'yuv444p10le'}
};

const fraction = value => {
  const [n, d = 1] = String(value).split('/').map(Number);
  return n / d;
};

function getPythonBin() {
  const pinokioPy = 'C:\\pinokio\\api\\wan.git\\app\\venv\\Scripts\\python.exe';
  if (fsSync.existsSync(pinokioPy)) return pinokioPy;
  if (process.env.PYTHON_PATH && fsSync.existsSync(process.env.PYTHON_PATH)) return process.env.PYTHON_PATH;
  return 'python';
}

export async function uploadedPath(root, url, kind = 'video') {
  if (typeof url !== 'string' || !url.startsWith('/api/media/')) throw new Error('Select an uploaded local file.');
  const name = decodeURIComponent(url.slice('/api/media/'.length));
  if (!name || name !== path.basename(name) || /[\\/]/.test(name)) throw new Error('Invalid upload path.');
  const allowed = kind === 'image' ? /\.(png|jpe?g|webp)$/i : /\.(mov|mp4|mkv|webm|avi)$/i;
  if (!allowed.test(name)) throw new Error(kind === 'image' ? 'Reference must be PNG, JPG or WebP.' : 'Video must be MOV, MP4, MKV, WebM or AVI.');
  const file = path.join(root, name);
  await fs.access(file);
  return file;
}

export async function probeVideo(ffmpeg, file) {
  const probe = path.join(path.dirname(ffmpeg), process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe');
  const {stdout} = await exec(probe, ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file], {windowsHide: true, maxBuffer: 4 * 1024 * 1024});
  const data = JSON.parse(stdout);
  const v = data.streams.find(s => s.codec_type === 'video');
  if (!v) throw new Error('The selected file has no video stream.');
  const fps = fraction(v.avg_frame_rate);
  const nominal = fraction(v.r_frame_rate);
  const duration = Number(v.duration || data.format.duration);
  if (!(fps > 0 && duration > 0)) throw new Error('Could not determine video frame rate or duration.');
  if (Math.abs(fps - nominal) > 0.02) throw new Error('Use constant-frame-rate footage and mask for frame-aligned inpainting.');
  const frames = Number(v.nb_frames) || Math.round(fps * duration);
  return {width: v.width, height: v.height, fps, fpsExpression: v.avg_frame_rate, duration, frames, hasAudio: data.streams.some(s => s.codec_type === 'audio'), codec: v.codec_name};
}

export function validatePair(source, mask) {
  if (source.width !== mask.width || source.height !== mask.height) throw new Error('Mask dimensions must match the source video.');
  if (Math.abs(source.fps - mask.fps) > 0.001) throw new Error('Mask frame rate must match the source video.');
  if (source.frames !== mask.frames || Math.abs(source.duration - mask.duration) > 0.5 / source.fps) throw new Error('Mask duration and frame count must match the source video.');
  if (source.width % 2 || source.height % 2) throw new Error('Use footage with even pixel dimensions for ProRes export.');
}

export function maskFilter({invert = false, expand = 0, feather = 0} = {}) {
  const filters = ['format=gray', ...(invert ? ['negate'] : []), "lut=y='if(gte(val,128),255,0)'"];
  for (let i = 0; i < expand; i++) filters.push('dilation');
  if (feather > 0) filters.push(`gblur=sigma=${feather}`);
  return filters.join(',');
}

export async function normalizeMask({ffmpeg, input, output, info, invert, expand}) {
  const py = getPythonBin();
  const script = path.join(__dirname, 'mask-processor.py');
  const tempPre = output + '.pre.mp4';
  let usedPython = false;

  try {
    const expandPx = Math.max(Number(expand || 0), 16);
    await exec(py, [script, '--input', input, '--output', tempPre, '--expand', String(expandPx)], {
      windowsHide: true,
      maxBuffer: 4 * 1024 * 1024,
      timeout: 120000
    });
    usedPython = true;
  } catch (err) {
    console.warn('[normalizeMask] Python preprocessor fallback:', err?.message || err);
  }

  const maskInput = usedPython ? tempPre : input;
  const ffmpegExpand = usedPython ? 0 : Number(expand || 0);

  try {
    await exec(ffmpeg, [
      '-nostdin', '-y', '-threads', '2',
      '-i', maskInput,
      '-an',
      '-vf', maskFilter({invert: Boolean(invert), expand: ffmpegExpand}),
      '-frames:v', String(info.frames),
      '-r', info.fpsExpression,
      '-c:v', 'ffv1',
      '-threads', '2',
      output
    ], {windowsHide: true, maxBuffer: 4 * 1024 * 1024});
  } finally {
    if (usedPython) {
      try { await fs.unlink(tempPre); } catch {}
    }
  }
}

export async function compositeProRes({ffmpeg, source, generated, mask, output, info, profile = '422hq', feather = 4, keepAudio = true, signal}) {
  const p = PRORES[profile];
  if (!p) throw new Error('Unsupported ProRes profile.');
  const format = 'gbrp16le';
  // Adaptive feathering sigma for high-res / 4K footage (prevents harsh cutout borders)
  const effectiveFeather = Math.max(Number(feather || 4), Math.round((info.width || 1920) / 340));
  const filter = `[0:v]setpts=PTS-STARTPTS,setsar=1,format=${format}[original];[1:v]setpts=PTS-STARTPTS,scale=${info.width}:${info.height}:flags=bicubic,setsar=1,format=${format}[edit];[2:v]setpts=PTS-STARTPTS,${effectiveFeather ? `gblur=sigma=${effectiveFeather},` : ''}format=${format}[mask];[original][edit][mask]maskedmerge[out]`;
  await exec(ffmpeg, [
    '-nostdin', '-y', '-threads', '2',
    '-i', source,
    '-i', generated,
    '-i', mask,
    '-filter_complex_threads', '2',
    '-filter_complex', filter,
    '-map', '[out]',
    ...(keepAudio && info.hasAudio ? ['-map', '0:a:0', '-c:a', 'pcm_s24le'] : ['-an']),
    '-c:v', 'prores_ks',
    '-profile:v', String(p.profile),
    '-pix_fmt', p.pixel,
    '-threads', '2',
    '-r', info.fpsExpression,
    '-frames:v', String(info.frames),
    '-t', String(info.duration),
    '-f', 'mov',
    output
  ], {windowsHide: true, maxBuffer: 4 * 1024 * 1024, signal});
}

export async function makePreview({ffmpeg, input, output, signal}) {
  await exec(ffmpeg, ['-nostdin', '-y', '-threads', '2', '-i', input, '-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-pix_fmt', 'yuv420p', '-threads', '2', '-c:a', 'aac', '-movflags', '+faststart', '-f', 'mp4', output], {windowsHide: true, maxBuffer: 4 * 1024 * 1024, signal});
}

export async function makeInputPreview({ffmpeg, input, output}) {
  await exec(ffmpeg, ['-nostdin', '-y', '-threads', '2', '-i', input, '-map', '0:v:0', '-an', '-vf', 'scale=960:960:force_original_aspect_ratio=decrease:force_divisible_by=2', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p', '-threads', '2', '-movflags', '+faststart', '-f', 'mp4', output], {windowsHide: true, maxBuffer: 4 * 1024 * 1024, timeout: 180000});
}
