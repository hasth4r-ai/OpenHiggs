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

  const rawAr = body.aspect_ratio || body.ar || '1:1';
  const normalizedAr = ['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3', '21:9'].includes(rawAr) ? rawAr : '1:1';
  const { width, height } = parseDimensions(normalizedAr, body.resolution || body.quality);
  const sizeString = `${width}x${height}`;

  // MiniMax API Key resolution (request header, body payload, or env variable)
  const authHeader = request.headers.get('authorization') || '';
  const apiKey = authHeader.replace(/^Bearer\s+/i, '').trim() || body.apiKey || process.env.MINIMAX_API_KEY || '';

  // 1. Try local SGLang / vLLM / Diffusers server on standard ports (30000 or 8000)
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

  // 2. If local server did not respond and an API key is provided, route through MiniMax Cloud API
  if (!generatedBuffer && apiKey) {
    const cloudEndpoints = [
      'https://api.minimax.io/v1/image_generation',
      'https://api.minimaxi.chat/v1/image_generation',
      'https://api.minimax.io/v1/images/generations'
    ];

    for (const endpoint of cloudEndpoints) {
      try {
        const isImageGen = endpoint.endsWith('/image_generation');
        const payload = isImageGen
          ? {
              model: 'image-01',
              prompt: body.prompt,
              aspect_ratio: normalizedAr,
              response_format: 'url'
            }
          : {
              model: 'image-01',
              prompt: body.prompt,
              size: sizeString,
              response_format: 'b64_json'
            };

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(90000)
        });

        if (res.ok) {
          const data = await res.json();
          // Check for URL or b64 response
          const imgUrl = data?.data?.[0]?.url || data?.image_url || data?.data?.image_url;
          const b64 = data?.data?.[0]?.b64_json || data?.b64_json;

          if (imgUrl) {
            const imgRes = await fetch(imgUrl);
            if (imgRes.ok) {
              const arrayBuf = await imgRes.arrayBuffer();
              generatedBuffer = Buffer.from(arrayBuf);
              break;
            }
          } else if (b64) {
            generatedBuffer = Buffer.from(b64, 'base64');
            break;
          }
        }
      } catch (err) {
        console.warn(`[ImageGenerate] Cloud endpoint ${endpoint} failed:`, err.message);
      }
    }
  }

  // 3. If neither local inference server nor API key yielded a real image, return a clear diagnostic
  if (!generatedBuffer) {
    return Response.json({
      error: 'MiniMax H3 Image local model is not running on port 30000. Please launch the local open-source model using "scripts\\Start MiniMax H3 Image.cmd".'
    }, { status: 400 });
  }

  // 4. Save the generated PNG image to data/generations
  const fileName = `image_${id}.png`;
  const filePath = path.join(outputDir, fileName);
  await fs.writeFile(filePath, generatedBuffer);

  const imageUrl = `/api/generations/${fileName}`;

  const record = {
    id,
    runId,
    createdAt: new Date().toISOString(),
    status: 'completed',
    model: modelName,
    workflow: 'image',
    prompt: body.prompt,
    aspectRatio: normalizedAr,
    resolution: sizeString,
    url: imageUrl,
    fileName
  };

  try {
    await saveGeneration(record);
  } catch (e) {
    console.error('[ImageGenerate] Failed to record generation:', e);
  }

  return Response.json({
    id,
    url: imageUrl,
    fileName,
    model: modelName,
    prompt: body.prompt
  });
}
