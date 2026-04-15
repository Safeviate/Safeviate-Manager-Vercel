import { NextResponse } from 'next/server';

export async function GET() {
  const isProduction = process.env.NODE_ENV === 'production';
  const configured = Boolean(process.env.AZURE_STORAGE_CONNECTION_STRING) || !isProduction;

  return NextResponse.json({
    configured,
    storage: process.env.AZURE_STORAGE_CONNECTION_STRING ? 'azure-blob' : isProduction ? 'unconfigured' : 'local',
  });
}
