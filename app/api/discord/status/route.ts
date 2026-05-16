import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    publicKeySet: !!process.env.DISCORD_PUBLIC_KEY,
    appIdSet: !!process.env.DISCORD_APP_ID,
    botTokenSet: !!process.env.DISCORD_BOT_TOKEN,
    appUrl: process.env.APP_URL || null,
  });
}
