# Contributing to Valor

## Prerequisites

- **Node.js** 20+ (tested with 22 LTS)
- **npm** 10+
- **Neon Postgres project** (free tier) — sign up at [neon.tech](https://neon.tech)
- **Telegram bot token** — create via [@BotFather](https://t.me/botfather)
- **Gemini API key** — get from [aistudio.google.com](https://aistudio.google.com)
- **Upstash QStash** — create at [upstash.com](https://upstash.com)

---

## Local Setup

### 1. Clone and Install

```bash
git clone https://github.com/your-username/valor.git
cd valor
npm install
```

### 2. Environment Variables

Copy the example env file and fill in your credentials:

```bash
cp .env.production.example .env.local
```

Required for app to function:
```env
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
AUTH_SECRET=your-auth-secret
AUTH_URL=http://localhost:9002
NEXT_PUBLIC_APP_URL=http://localhost:9002
GEMINI_API_KEY=your-gemini-api-key
```

Optional (on-chain tipping — portfolio mode, not needed for dev):
```env
TREASURY_PRIVATE_KEY=0xyour-master-private-key
```

Required for async processing:
```env
QSTASH_TOKEN=your-qstash-token
QSTASH_CURRENT_SIGNING_KEY=your-current-signing-key
QSTASH_NEXT_SIGNING_KEY=your-next-signing-key
```

Optional (webhook security):
```env
CRON_SECRET=your-cron-secret
```

### 3. Database

Create your schema in Neon by running Drizzle migrations:

```bash
# Generate migration from schema
npx drizzle-kit generate

# Apply migration to Neon
npx drizzle-kit migrate
```

Alternatively, push the schema directly (faster for development):
```bash
npx drizzle-kit push
```

### 4. Run

```bash
npm run dev
```

The app starts on port 9002. Open [http://localhost:9002](http://localhost:9002).

### 5. Set Up Telegram Webhook (for local testing)

```bash
# Install ngrok
npm install -g ngrok

# Expose local server
ngrok http 9002

# Register webhook with Telegram
# Replace TOKEN with your bot token, NGROK_URL with your ngrok URL
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://<NGROK_URL>/api/webhook/<TOKEN>", "secret_token": "<WEBHOOK_SECRET>"}'
```

The webhook secret is derived as `sha256(botToken + cronSecret)`. For local dev without `CRON_SECRET` set, the fallback value `dev-fallback-secret` is used.

---

## Development Scripts

```bash
npm run dev        # Start dev server (Turbopack, port 9002)
npm run build      # Production build
npm run start      # Start production server
npm run lint       # Run Next.js ESLint
npm run typecheck  # Run TypeScript type checking (tsc --noEmit)
```

---

## Code Style

### TypeScript
- Strict mode — no exceptions. If a type is complex, define it explicitly rather than using `any`.
- All function parameters and return types are annotated — no implicit `any` from inferred returns.
- Use `Record<string, T>` instead of index signatures where possible.

### Naming Conventions
- **Files:** PascalCase for components (`Hero.tsx`), camelCase for utilities (`filters.ts`)
- **Components:** PascalCase, named exports: `export function Hero()`
- **Functions:** camelCase, verb-prefixed: `getOrCreateContributorWallet`, `enqueueEvaluationJob`
- **Types:** PascalCase: `Community`, `Evaluation`, `Tip`
- **Interfaces:** PascalCase, no `I` prefix: `Props`, `FeedItem` (not `IFeedItem`)
- **Environment variables:** `UPPER_SNAKE_CASE`, `NEXT_PUBLIC_*` prefix for client-accessible

### File Structure
- One component per file — no exceptions
- Keep files under 200 lines. If a file exceeds this, split into modules.
- Group related components in feature directories: `components/dashboard/`, `components/onboarding/`

### Imports
Order imports in this sequence (separated by blank lines):
1. External libraries (`react`, `next`, `next-auth`, `drizzle-orm`)
2. Internal libraries (`@/lib/*`, `@/db/*`, `@/types/*`)
3. Local components (`@/components/*`)

No relative imports that go up more than one level — use `@/` aliases.

### Async Code
- Every `async` function has explicit error handling — never let a promise reject unhandled.
- API routes wrap bodies in try/catch and return structured JSON errors.
- External API calls (viem, Gemini, Telegram) never throw — they return error objects.
- Log format for errors: `JSON.stringify({ step, error, ...context })` — grep-able.

### React Patterns
- **Server Components by default** — only add `'use client'` when you need:
  - Interactivity (`onClick`, `onChange`, etc.)
  - React hooks (`useState`, `useEffect`, etc.)
  - Browser-only APIs (`localStorage`, `navigator.clipboard`, etc.)
- **`useCallback` for callbacks passed to children** — prevent unnecessary re-renders.
- **`Suspense` for client-only pages** — wrap components that use `useSearchParams()` (see `claim/page.tsx`).

---

## Component Conventions

### Creating a New Component

1. Determine if it's Server or Client component
2. Create file in the appropriate directory:
   - `components/ui/` — shadcn/ui primitives (don't edit these manually)
   - `components/dashboard/` — dashboard-specific components
   - `components/landing/` — landing page components
   - `components/onboarding/` — onboarding wizard components
   - `components/shared/` — components used by 2+ features
   - Next to the page (colocate) — page-specific components
3. Define a `Props` interface if the component takes parameters
4. Export as a named function

### Component Template (Server Component)

```typescript
// components/example/ExampleWidget.tsx
interface Props {
  title: string;
  items: string[];
}

export function ExampleWidget({ title, items }: Props) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="text-lg font-semibold">{title}</h3>
      <ul className="mt-2 space-y-1">
        {items.map((item) => (
          <li key={item} className="text-sm text-muted-foreground">{item}</li>
        ))}
      </ul>
    </div>
  );
}
```

### Component Template (Client Component)

```typescript
'use client';

import { useState } from 'react';

interface Props {
  initialValue: string;
  onSave: (value: string) => void;
}

export function EditableField({ initialValue, onSave }: Props) {
  const [value, setValue] = useState(initialValue);

  return (
    <div className="space-y-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      />
      <button onClick={() => onSave(value)}>Save</button>
    </div>
  );
}
```

---

## Route Handler Conventions

### API Route Template

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // 1. Auth check
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    // 2. Business logic
    const db = getDb();
    const rows = await db.select().from(schema.communities);

    // 3. Response
    return NextResponse.json(rows ?? []);
  } catch (err) {
    console.error(JSON.stringify({
      step: 'handler_name',
      error: err instanceof Error ? err.message : 'Unknown error',
    }));
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
```

---

## PR Workflow

1. Create a branch from `main` with a descriptive name: `fix/claim-page-error`, `feat/community-search`
2. Make focused commits — one logical change per commit
3. Run `npm run typecheck` and `npm run lint` before pushing
4. Open a PR with a description of what changed and why
5. Request review from a maintainer

### Commit Messages

Follow conventional commits format:

```
type(scope): description

feat(dashboard): add community search filter
fix(webhook): handle QStash signature verification timeout
refactor(config): extract env validation to shared module
docs: add contributing guide
```

Types: `feat`, `fix`, `refactor`, `docs`, `chore`, `style`, `perf`, `test`

---

## Testing

Tests are not yet configured. To add tests:

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

Add test files alongside source files with `.test.ts` or `.test.tsx` extension. Run with:

```bash
npx vitest
```

---

## Questions?

Open an issue or start a discussion in the GitHub repository.
