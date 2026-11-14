import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import { getInstallRoot } from '../../../local-hosting/root.mjs';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file) {
      return NextResponse.json({ code: 400, msg: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadsDir = path.resolve(getInstallRoot(), 'data', 'uploads');
    await fs.mkdir(uploadsDir, { recursive: true });

    const rawName = path.basename(file.name || 'upload.bin');
    const sanitizedName = rawName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = `${Date.now()}_${sanitizedName}`;
    const targetPath = path.join(uploadsDir, fileName);

    await fs.writeFile(targetPath, buffer);

    const mediaUrl = `/api/media/${encodeURIComponent(fileName)}`;

    return NextResponse.json({
      code: 200,
      data: {
        fileUrl: mediaUrl,
        url: mediaUrl,
        localPath: targetPath,
        fileName: fileName,
        originalName: rawName,
      },
    });
  } catch (err) {
    console.error('[API upload] Error:', err);
    return NextResponse.json({ code: 500, msg: err.message }, { status: 500 });
  }
}
