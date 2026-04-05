import { authOptions } from '@/auth';
import { put } from '@vercel/blob';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email?.trim().toLowerCase();

  if (!userEmail) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file');
  const displayNameRaw = formData.get('displayName');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 });
  }

  const displayName = typeof displayNameRaw === 'string' && displayNameRaw.trim() ? displayNameRaw.trim() : file.name;
  const now = new Date();
  const datePrefix = now.toISOString().slice(0, 10);
  const safeDisplayName = sanitizeFileName(displayName);
  const safeFileName = sanitizeFileName(file.name);
  const blobPath = `uploads/${datePrefix}/${safeDisplayName}-${Date.now()}-${safeFileName}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(blobPath, file, {
      access: 'public',
      addRandomSuffix: false,
      contentType: file.type || 'application/octet-stream',
    });

    return NextResponse.json({
      name: displayName,
      url: blob.url,
      uploadDate: now.toISOString(),
      expirationDate: null,
      size: file.size,
      contentType: file.type || null,
    });
  }

  const localUrlPath = `/${blobPath}`;
  const uploadsRoot = path.join(process.cwd(), 'public');
  const localFilePath = path.join(uploadsRoot, blobPath);
  await mkdir(path.dirname(localFilePath), { recursive: true });
  const bytes = await file.arrayBuffer();
  await writeFile(localFilePath, Buffer.from(bytes));

  return NextResponse.json({
    name: displayName,
    url: localUrlPath,
    uploadDate: now.toISOString(),
    expirationDate: null,
    size: file.size,
    contentType: file.type || null,
  });
}
