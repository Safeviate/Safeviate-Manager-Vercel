import { authOptions } from '@/auth';
import { BlobServiceClient } from '@azure/storage-blob';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function getAzureBlobConfig() {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING?.trim();
  const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME?.trim() || 'uploads';

  if (!connectionString) {
    return null;
  }

  return { connectionString, containerName };
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

  const azureBlobConfig = getAzureBlobConfig();
  if (azureBlobConfig) {
    const serviceClient = BlobServiceClient.fromConnectionString(azureBlobConfig.connectionString);
    const containerClient = serviceClient.getContainerClient(azureBlobConfig.containerName);
    await containerClient.createIfNotExists({ access: 'blob' });

    const blockBlobClient = containerClient.getBlockBlobClient(blobPath);
    const bytes = await file.arrayBuffer();
    await blockBlobClient.uploadData(Buffer.from(bytes), {
      blobHTTPHeaders: {
        blobContentType: file.type || 'application/octet-stream',
      },
    });

    return NextResponse.json({
      name: displayName,
      url: blockBlobClient.url,
      uploadDate: now.toISOString(),
      expirationDate: null,
      size: file.size,
      contentType: file.type || null,
    });
  }

  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      {
        error:
          'Azure Blob Storage is not configured. Add AZURE_STORAGE_CONNECTION_STRING and AZURE_STORAGE_CONTAINER_NAME to enable file uploads in production.',
      },
      { status: 503 }
    );
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
