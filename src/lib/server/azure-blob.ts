import { BlobServiceClient } from '@azure/storage-blob';

export function getAzureBlobConfig() {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING?.trim();
  const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME?.trim() || 'uploads';

  if (!connectionString) {
    return null;
  }

  return { connectionString, containerName };
}

export function getAzureBlobContainerClient() {
  const config = getAzureBlobConfig();

  if (!config) {
    return null;
  }

  const serviceClient = BlobServiceClient.fromConnectionString(config.connectionString);
  return serviceClient.getContainerClient(config.containerName);
}

export function buildUploadViewUrl(blobName: string) {
  return `/api/uploads/view?path=${encodeURIComponent(blobName)}`;
}

export function getBlobNameFromAzureUrl(blobUrl: string) {
  const config = getAzureBlobConfig();
  if (!config) return null;

  try {
    const url = new URL(blobUrl);
    const pathParts = url.pathname.split('/').filter(Boolean);
    if (pathParts[0] !== config.containerName) return null;

    return pathParts.slice(1).join('/');
  } catch {
    return null;
  }
}

export function normalizeUploadUrl(uploadUrl: string) {
  if (uploadUrl.startsWith('/api/uploads/view') || uploadUrl.startsWith('/uploads/')) {
    return uploadUrl;
  }

  const blobName = getBlobNameFromAzureUrl(uploadUrl);
  return blobName ? buildUploadViewUrl(blobName) : uploadUrl;
}
