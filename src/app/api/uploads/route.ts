import { authOptions } from '@/auth';
import { put } from '@vercel/blob';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

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
  const path = `uploads/${datePrefix}/${safeDisplayName}-${Date.now()}-${safeFileName}`;

  const blob = await put(path, file, {
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
