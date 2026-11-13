import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

const MIME_TYPES = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
};

export async function GET(request, { params }) {
  try {
    const resolvedParams = await params;
    const filename = resolvedParams?.filename;
    if (!filename) {
      return new NextResponse('Filename required', { status: 400 });
    }

    const safeName = path.basename(decodeURIComponent(filename));
    const genDir = path.resolve(process.cwd(), '..', 'data', 'generations');
    const filePath = path.join(genDir, safeName);

    if (!fs.existsSync(filePath)) {
      return new NextResponse('File not found', { status: 404 });
    }

    const stat = fs.statSync(filePath);
    const ext = path.extname(safeName).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    const fileStream = fs.createReadStream(filePath);
    return new NextResponse(fileStream, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': stat.size.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err) {
    return new NextResponse(err.message, { status: 500 });
  }
}
