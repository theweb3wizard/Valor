import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { botToken } = await request.json();

    if (!botToken || typeof botToken !== 'string') {
      return NextResponse.json({ error: 'bot token required' }, { status: 400 });
    }

    const res = await fetch(`https://api.telegram.org/bot${botToken}/getMe`, {
      method: 'GET',
    });

    const data = await res.json();

    if (!data.ok) {
      return NextResponse.json({ error: 'invalid bot token' }, { status: 400 });
    }

    return NextResponse.json({
      username: data.result.username,
      id: data.result.id,
    });
  } catch (err) {
    console.error(
      JSON.stringify({
        step: 'verify_bot',
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    );
    return NextResponse.json({ error: 'verification failed' }, { status: 500 });
  }
}
