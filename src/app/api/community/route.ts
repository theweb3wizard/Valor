import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { serverConfig } from '@/lib/config';
import { auth } from '@/lib/auth';
import { createCommunityTreasury } from '@/lib/cdp/wallets';
import { setBotWebhook } from '@/lib/telegram/notify';
import { getDb } from '@/lib/db';
import * as schema from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    const user = session.user;

    const db = getDb();
    if (!db) return NextResponse.json({ error: 'database not configured' }, { status: 500 });

    const communities = await db.select().from(schema.communities).where(eq(schema.communities.ownerUserId, user.id!)).orderBy(desc(schema.communities.createdAt));

    return NextResponse.json(communities ?? []);
  } catch (err) {
    console.error(
      JSON.stringify({
        step: 'list_communities',
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    );
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    const user = session.user;

    const body = await request.json();
    const { name, botToken, telegramChatId } = body as {
      name: string;
      botToken: string;
      telegramChatId: string;
    };

    if (!name || !botToken) {
      return NextResponse.json({ error: 'missing required fields' }, { status: 400 });
    }

    const db = getDb();
    if (!db) return NextResponse.json({ error: 'database not configured' }, { status: 500 });

    const botRes = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const botData = await botRes.json();
    if (!botData.ok || !botData.result?.username) {
      return NextResponse.json({ error: 'invalid bot token' }, { status: 400 });
    }

    const [existingBot] = await db.select({ id: schema.communities.id }).from(schema.communities).where(eq(schema.communities.botToken, botToken)).limit(1);

    if (existingBot) {
      return NextResponse.json({ error: 'bot token already registered' }, { status: 409 });
    }

    const [userRow] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.id, user.id!)).limit(1);

    if (!userRow) {
      await db.insert(schema.users).values({ id: user.id, email: user.email });
    }

    const chatId = telegramChatId || `pending-${botToken.slice(0, 8)}`;

    const [community] = await db.insert(schema.communities).values({
      ownerUserId: user.id!,
      name,
      telegramChatId: chatId,
      botToken: botToken,
    }).returning();

    if (!community) {
      return NextResponse.json({ error: 'failed to create community' }, { status: 500 });
    }

    const webhookSecret = createHash('sha256')
      .update(botToken + (serverConfig.hasCronSecret ? serverConfig.cronSecret : 'dev-fallback-secret'))
      .digest('hex');

    const webhookUrl = `${serverConfig.appUrl}/api/webhook/${botToken}`;

    await setBotWebhook({ botToken, webhookUrl, secretToken: webhookSecret });

    let treasury: { walletId: string; address: string } | null = null;
    try {
      treasury = await createCommunityTreasury(community.id);
    } catch (err) {
      console.error(
        JSON.stringify({
          step: 'onboarding_treasury',
          communityId: community.id,
          error: err instanceof Error ? err.message : 'unknown',
        })
      );
    }

    return NextResponse.json({
      community: {
        ...community,
        treasury_wallet_id: treasury?.walletId || null,
        treasury_address: treasury?.address || null,
      },
    });
  } catch (err) {
    console.error(
      JSON.stringify({
        step: 'create_community',
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    );
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
