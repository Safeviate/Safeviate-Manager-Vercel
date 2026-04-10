import { NextResponse } from 'next/server';

export async function GET() {
  const isProduction = Boolean(process.env.VERCEL);
  const configured = Boolean(process.env.BLOB_READ_WRITE_TOKEN) || !isProduction;

  return NextResponse.json({
    configured,
    storage: process.env.BLOB_READ_WRITE_TOKEN ? 'vercel-blob' : isProduction ? 'unconfigured' : 'local',
  });
}
