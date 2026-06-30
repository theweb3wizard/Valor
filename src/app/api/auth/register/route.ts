import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { getDb } from '@/lib/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'email and password required' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'password must be at least 8 characters' }, { status: 400 });
    }

    const db = getDb();
    if (!db) {
      return NextResponse.json({ error: 'database not configured' }, { status: 500 });
    }

    const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing) {
      return NextResponse.json({ error: 'email already registered' }, { status: 409 });
    }

    const passwordHash = await hash(password, 12);

    const [user] = await db.insert(users).values({ email, passwordHash }).returning();

    return NextResponse.json({ user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error(JSON.stringify({ step: 'register', error: err instanceof Error ? err.message : 'Unknown error' }));
    return NextResponse.json({ error: 'registration failed' }, { status: 500 });
  }
}
