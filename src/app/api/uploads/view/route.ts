import { authOptions } from '@/auth';
import { getAzureBlobContainerClient } from '@/lib/server/azure-blob';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email?.trim().toLowerCase();

  if (!userEmail) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const blobPath = url.searchParams.get('path')?.trim();

  if (!blobPath || blobPath.includes('..') || blobPath.startsWith('/')) {
    return NextResponse.json({ error: 'Invalid file path.' }, { status: 400 });
  }

  const containerClient = getAzureBlobContainerClient();
  if (!containerClient) {
    return NextResponse.json({ error: 'Azure Blob Storage is not configured.' }, { status: 503 });
  }

  const blobClient = containerClient.getBlobClient(blobPath);
  const exists = await blobClient.exists();

  if (!exists) {
    return NextResponse.json({ error: 'File not found.' }, { status: 404 });
  }

  const downloadResponse = await blobClient.download();

  if (!downloadResponse.readableStreamBody) {
    return NextResponse.json({ error: 'File could not be read.' }, { status: 500 });
  }

  const headers = new Headers();
  headers.set('Content-Type', downloadResponse.contentType || 'application/octet-stream');
  headers.set('Cache-Control', 'private, max-age=300');

  if (downloadResponse.contentLength !== undefined) {
    headers.set('Content-Length', String(downloadResponse.contentLength));
  }

  return new Response(downloadResponse.readableStreamBody as unknown as BodyInit, { headers });
}
