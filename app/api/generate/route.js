import { NextResponse } from 'next/server';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function POST(request) {
  try {
    const body = await request.json();
    const { prompt, compiledPrompt, references = [], duration = 5, quality = '2K', steps = 8 } = body;

    const uploadsDir = path.resolve(process.cwd(), '..', 'data', 'uploads');
    const tempDir = path.resolve(process.cwd(), '..', 'temp');
    await fs.mkdir(tempDir, { recursive: true });

    // Map reference URLs to absolute local paths on disk
    const imagePaths = [];
    const videoPaths = [];
    const audioPaths = [];

    for (const ref of references) {
      const urlParts = (ref.url || '').split('/');
      const rawName = decodeURIComponent(urlParts[urlParts.length - 1] || '');
      const fullPath = path.join(uploadsDir, rawName);
      try {
        await fs.access(fullPath);
        if (ref.type === 'video') videoPaths.push(fullPath);
        else if (ref.type === 'audio') audioPaths.push(fullPath);
        else imagePaths.push(fullPath);
      } catch {
        // file doesn't exist
      }
    }

    // If no image paths from references, auto-check if there's any file in uploads
    if (imagePaths.length === 0) {
      try {
        const files = await fs.readdir(uploadsDir);
        const imgFiles = files.filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f));
        if (imgFiles.length > 0) {
          // Sort by newest
          imgFiles.sort().reverse();
          imagePaths.push(path.join(uploadsDir, imgFiles[0]));
        }
      } catch (e) {}
    }

    // Determine resolution
    let resolution = '832x480';
    if (quality === '1080p') resolution = '1280x720';
    else if (quality === '2K') resolution = '1920x1088';

    const payload = {
      model_type: 'minimax_h3_ref2va_pruned',
      prompt: compiledPrompt || prompt,
      image_refs: imagePaths,
      video_refs: videoPaths,
      audio_refs: audioPaths,
      resolution,
      num_inference_steps: steps,
      duration: parseInt(duration) || 5,
    };

    const taskFile = path.join(tempDir, `task_${Date.now()}.json`);
    await fs.writeFile(taskFile, JSON.stringify(payload, null, 2), 'utf-8');

    const pythonExe = 'C:\\pinokio\\api\\wan.git\\app\\venv\\Scripts\\python.exe';
    const scriptPath = path.resolve(process.cwd(), '..', 'scripts', 'wan_generate.py');

    // Return Server-Sent Events stream for real-time progress updates
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        const send = (data) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        send({ type: 'start', message: 'Connecting to Wan2GP engine...' });

        const proc = spawn(pythonExe, [scriptPath, taskFile], {
          cwd: 'C:\\pinokio\\api\\wan.git\\app',
        });

        let lastResult = null;
        let lastError = null;

        proc.stdout.on('data', (chunk) => {
          const lines = chunk.toString().split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            if (trimmed.startsWith('PROGRESS:')) {
              const parts = trimmed.split(':');
              const pct = parseFloat(parts[1]) || 0;
              const step = parseInt(parts[2]) || 0;
              const total = parseInt(parts[3]) || 0;
              const phase = parts[4] || '';
              send({ type: 'progress', pct, step, total, phase });
            } else if (trimmed.startsWith('RESULT:')) {
              try {
                const files = JSON.parse(trimmed.slice(7));
                lastResult = files;
              } catch (e) {}
            } else if (trimmed.startsWith('ERROR:')) {
              lastError = trimmed.slice(6);
            } else {
              send({ type: 'log', message: trimmed });
            }
          }
        });

        proc.stderr.on('data', (chunk) => {
          const msg = chunk.toString().trim();
          if (msg) send({ type: 'log', message: msg });
        });

        proc.on('close', async (code) => {
          try {
            await fs.unlink(taskFile);
          } catch {}

          if (code === 0 && lastResult && lastResult.length > 0) {
            const fileName = lastResult[0];
            send({
              type: 'done',
              videoUrl: `/api/generations/${encodeURIComponent(fileName)}`,
              fileName,
            });
          } else {
            send({
              type: 'error',
              message: lastError || `Process exited with code ${code}`,
            });
          }
          controller.close();
        });

        proc.on('error', (err) => {
          send({ type: 'error', message: err.message });
          controller.close();
        });
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (err) {
    console.error('[API generate] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
