import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { auth } from '@/lib/auth';
import { serverConfig } from '@/lib/config';
import { getDb } from '@/lib/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { setBotWebhook } from '@/lib/telegram/notify';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    const user = session.user;

    const db = getDb();
    if (!db) return NextResponse.json({ error: 'database not configured' }, { status: 500 });

    const [community] = await db
      .select({ bot_token: schema.communities.botToken, owner_user_id: schema.communities.ownerUserId })
      .from(schema.communities)
      .where(eq(schema.communities.id, id))
      .limit(1);

    if (!community || community.owner_user_id !== user.id) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }

    const secret = serverConfig.hasCronSecret ? serverConfig.cronSecret : 'dev-fallback-secret';
    const webhookSecret = createHash('sha256')
      .update(community.bot_token + secret)
      .digest('hex');

    const webhookUrl = `${serverConfig.appUrl}/api/webhook/${community.bot_token}`;

    await setBotWebhook({
      botToken: community.bot_token,
      webhookUrl,
      secretToken: webhookSecret,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(
      JSON.stringify({
        step: 're_register_webhook',
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    );
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
