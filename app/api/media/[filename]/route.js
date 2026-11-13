import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

const MIME_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
};

export async function GET(request, { params }) {
  try {
    const resolvedParams = await params;
    const filename = resolvedParams?.filename;
    if (!filename) {
      return new NextResponse('Filename required', { status: 400 });
    }

    const safeName = path.basename(decodeURIComponent(filename));
    const uploadsDir = path.resolve(process.cwd(), '..', 'data', 'uploads');
    const filePath = path.join(uploadsDir, safeName);

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
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err) {
    return new NextResponse(err.message, { status: 500 });
  }
}
