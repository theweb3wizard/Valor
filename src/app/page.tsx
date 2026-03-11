// src/app/page.tsx — server component, forces dynamic rendering
import { headers } from 'next/headers';
import DashboardClient from './dashboard-client';

export const dynamic = 'force-dynamic';

export default async function Home() {
  // Reading headers forces Next.js into dynamic server rendering.
  // This ensures instrumentation.ts runs and the bot stays alive.
  await headers();
  return <DashboardClient />;
}