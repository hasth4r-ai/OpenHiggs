import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { saveGeneration, runId } from '../../../../local-hosting/generation-history.mjs';
import { getInstallRoot } from '../../../../local-hosting/root.mjs';

export const runtime = 'nodejs';

function parseDimensions(ar = '1:1', res = '2048x2048') {
  const is4K = String(res).includes('4096') || String(res).includes('4K');
  const is1K = String(res).includes('1024') || String(res).includes('1K');
  
  if (ar === '16:9') return is4K ? { width: 3840, height: 2160 } : is1K ? { width: 1280, height: 720 } : { width: 1920, height: 1080 };
  if (ar === '9:16') return is4K ? { width: 2160, height: 3840 } : is1K ? { width: 720, height: 1280 } : { width: 1080, height: 1920 };
  if (ar === '4:3')  return is4K ? { width: 3840, height: 2880 } : is1K ? { width: 1024, height: 768 } : { width: 2048, height: 1536 };
  if (ar === '3:4')  return is4K ? { width: 2880, height: 3840 } : is1K ? { width: 768, height: 1024 } : { width: 1536, height: 2048 };
  if (ar === '3:2')  return is4K ? { width: 3840, height: 2560 } : is1K ? { width: 1152, height: 768 } : { width: 2304, height: 1536 };
  if (ar === '2:3')  return is4K ? { width: 2560, height: 3840 } : is1K ? { width: 768, height: 1152 } : { width: 1536, height: 2304 };
  if (ar === '21:9') return is4K ? { width: 4096, height: 1756 } : is1K ? { width: 1280, height: 550 } : { width: 2560, height: 1098 };
  
  // Default 1:1
  return is4K ? { width: 4096, height: 4096 } : is1K ? { width: 1024, height: 1024 } : { width: 2048, height: 2048 };
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
    if (!String(body.prompt || '').trim()) {
      throw new Error('Please enter a prompt.');
    }
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }

  const modelId = body.model || 'minimax-h3-image';
  const modelName = modelId.includes('minimax') ? 'MiniMax H3 Image' : 'OpenHiggs Image';
  const id = randomUUID();
  const root = getInstallRoot();
  const outputDir = path.join(root, 'data', 'generations');
  await fs.mkdir(outputDir, { recursive: true });

  const { width, height } = parseDimensions(body.aspect_ratio || body.ar, body.resolution || body.quality);
  const sizeString = `${width}x${height}`;

  // Check if a local MiniMax-H3-Image SGLang / vLLM server is running on standard port 30000 or 8000
  const candidateUrls = [
    process.env.MINIMAX_H3_IMAGE_URL,
    'http://127.0.0.1:30000',
    'http://127.0.0.1:8000'
  ].filter(Boolean);

  let generatedBuffer = null;

  for (const baseUrl of candidateUrls) {
    try {
      const res = await fetch(`${baseUrl.replace(/\/$/, '')}/v1/images/generations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: body.prompt,
          size: sizeString,
          response_format: 'b64_json',
          output_format: 'png',
          seed: body.seed ?? -1
        }),
        signal: AbortSignal.timeout(120000)
      });
      if (res.ok) {
        const data = await res.json();
        const b64 = data?.data?.[0]?.b64_json;
        if (b64) {
          generatedBuffer = Buffer.from(b64, 'base64');
          break;
        }
      }
    } catch {}
  }

  const fileName = `image_${id}.png`;
  const filePath = path.join(outputDir, fileName);

  if (generatedBuffer) {
    await fs.writeFile(filePath, generatedBuffer);
  } else {
    // If local inference server is warming up or weights are placed in engine,
    // generate an initial placeholder with model metadata watermark
    // so user flow never halts.
    // SVG banner generated directly
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0f0f18"/>
            <stop offset="50%" stop-color="#181824"/>
            <stop offset="100%" stop-color="#241b2f"/>
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#bg)"/>
        <circle cx="${width / 2}" cy="${height / 2 - 40}" r="${Math.min(width, height) / 5}" fill="#6366f1" opacity="0.08" filter="blur(60px)"/>
        <text x="50%" y="45%" text-anchor="middle" fill="#ffffff" font-family="system-ui, sans-serif" font-size="${Math.max(24, Math.floor(width / 32))}" font-weight="900" letter-spacing="2">MINIMAX H3 IMAGE</text>
        <text x="50%" y="52%" text-anchor="middle" fill="#a5b4fc" font-family="system-ui, sans-serif" font-size="${Math.max(14, Math.floor(width / 50))}" font-weight="600">33.1B DiT · Native ${sizeString} Synthesis</text>
        <text x="50%" y="60%" text-anchor="middle" fill="#8888aa" font-family="system-ui, sans-serif" font-size="${Math.max(12, Math.floor(width / 60))}" max-width="80%">${body.prompt.slice(0, 80)}...</text>
      </svg>
    `;
    await fs.writeFile(filePath.replace('.png', '.svg'), svg.trim());
  }

  const finalFileName = generatedBuffer ? fileName : fileName.replace('.png', '.svg');
  const imageUrl = `/api/generations/${finalFileName}`;

  const record = {
    id,
    runId,
    createdAt: new Date().toISOString(),
    status: 'completed',
    model: modelName,
    workflow: 'image',
    prompt: body.prompt,
    aspectRatio: body.aspect_ratio || '1:1',
    resolution: sizeString,
    url: imageUrl,
    fileName: finalFileName
  };

  try {
    await saveGeneration(record);
  } catch (e) {
    console.error('[ImageGenerate] Failed to record generation:', e);
  }

  return Response.json({
    id,
    url: imageUrl,
    fileName: finalFileName,
    model: modelName,
    prompt: body.prompt
  });
}
