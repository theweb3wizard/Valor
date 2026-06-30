import { auth } from '@/lib/auth';
import { type NextRequest, NextResponse } from 'next/server';

const publicPaths = [
  '/',
  '/claim',
  '/login',
  '/register',
  '/privacy',
  '/terms',
  '/refund',
  '/faq',
  '/api/auth',
  '/api/webhook',
  '/api/health',
  '/_next',
  '/favicon.ico',
];

function isPublicPath(pathname: string): boolean {
  return publicPaths.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const session = await auth();
  if (!session?.user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
