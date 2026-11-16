import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { saveGeneration, runId } from '../../../../local-hosting/generation-history.mjs';
import { getInstallRoot } from '../../../../local-hosting/root.mjs';
import { generateImage } from '../../../../local-hosting/wan-client.mjs';

export const runtime = 'nodejs';

function parseDimensions(ar = '1:1', res = '2048x2048') {
  const is4K = String(res).includes('4096') || String(res).includes('4K') || String(res).includes('16MP');
  const is1K = String(res).includes('1024') || String(res).includes('1K') || String(res).includes('1MP');
  
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

  const batchCount = Math.max(1, Math.min(4, Number(body.batch_size || body.batchCount || 1)));

  // Initial pending record in history feed (matches VideoStudio and standard platforms)
  const record = {
    id,
    runId,
    createdAt: new Date().toISOString(),
    status: 'generating',
    model: modelName,
    workflow: 'image',
    prompt: body.prompt,
    compiledPrompt: body.compiledPrompt || '',
    references: Array.isArray(body.references) ? body.references : [],
    aspectRatio: normalizedAr,
    resolution: sizeString,
    batchCount,
    progress: 5,
    phase: 'Preparing local GPU pipeline',
    eta: null
  };
  try {
    await saveGeneration(record);
  } catch (err) {
    console.warn('[ImageGenerate] Failed to record initial state:', err);
  }

  // 1. Primary: Run directly through local Wan2GP GPU queue (100% local open-source)
  try {
    const configPath = path.join(root, 'config', 'wan-engine.json');
    const rawConfig = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(rawConfig.replace(/^\uFEFF/, ''));
    if (config.baseUrl) {
      const res = await generateImage(
        {
          base: config.baseUrl,
          wanRoot: config.wanRoot,
          wanOutputRoot: config.wanOutputRoot,
          uploadsDir: path.join(root, 'data', 'uploads'),
          outputDir,
          body: {
            ...body,
            prompt: body.prompt,
            compiledPrompt: body.compiledPrompt || '',
            references: Array.isArray(body.references) ? body.references : [],
            batch_size: batchCount,
            resolution: sizeString
          }
        },
        async (progressData) => {
          if (progressData.type === 'progress') {
            Object.assign(record, {
              progress: progressData.pct,
              phase: progressData.phase,
              eta: progressData.eta,
              step: progressData.step,
              total: progressData.total
            });
            await saveGeneration(record).catch(() => {});
          }
        }
      );

      if (res?.fileName) {
        const images = (res.results && res.results.length)
          ? res.results.map(r => ({ url: r.imageUrl, fileName: r.fileName }))
          : [{ url: res.imageUrl, fileName: res.fileName }];

        Object.assign(record, {
          status: 'completed',
          progress: 100,
          phase: 'Completed',
          url: res.imageUrl,
          fileName: res.fileName,
          images,
          batchCount: images.length,
          references: Array.isArray(body.references) ? body.references : [],
          compiledPrompt: body.compiledPrompt || '',
          completedAt: new Date().toISOString()
        });
        await saveGeneration(record);
        return Response.json({
          id,
          url: res.imageUrl,
          fileName: res.fileName,
          images,
          batchCount: images.length,
          model: modelName,
          prompt: body.prompt
        });
      }
    }
  } catch (wanErr) {
    console.warn('[ImageGenerate] Wan2GP local generation failed/busy:', wanErr.message);
    if (!apiKey) {
      Object.assign(record, {
        status: 'failed',
        error: wanErr.message || 'Generation failed.',
        completedAt: new Date().toISOString()
      });
      await saveGeneration(record).catch(() => {});
      return Response.json({ error: wanErr.message || 'Local GPU generation failed.' }, { status: 500 });
    }
  }

  // 2. Cloud Fallback if API key was explicitly provided
  let generatedBuffer = null;
  if (apiKey) {
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
              response_format: 'base64'
            }
          : {
              model: 'minimax-h3-image',
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
          signal: AbortSignal.timeout(60000)
        });

        if (res.ok) {
          const data = await res.json();
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

  if (!generatedBuffer) {
    Object.assign(record, {
      status: 'failed',
      error: 'Generation failed. Local Wan2GP engine is currently busy or unavailable.',
      completedAt: new Date().toISOString()
    });
    await saveGeneration(record).catch(() => {});
    return Response.json({
      error: 'Generation failed. Local Wan2GP engine is currently busy or unavailable.'
    }, { status: 500 });
  }

  // Save the generated image
  const fileName = `image_${id}.png`;
  const filePath = path.join(outputDir, fileName);
  await fs.writeFile(filePath, generatedBuffer);

  const imageUrl = `/api/generations/${fileName}`;

  Object.assign(record, {
    status: 'completed',
    progress: 100,
    phase: 'Completed',
    url: imageUrl,
    fileName,
    completedAt: new Date().toISOString()
  });

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
