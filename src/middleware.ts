import { NextRequest, NextResponse } from 'next/server';

/**
 * Global middleware that runs on every request
 * Checks user subscription status and manages roles
 */
export async function middleware(request: NextRequest) {
  try {
    // Skip middleware for static files and API routes that don't need auth
    const { pathname } = request.nextUrl;
    
    // Skip for static files
    if (pathname.startsWith('/_next/') || 
        pathname.startsWith('/favicon.ico') ||
        pathname.startsWith('/public/') ||
        pathname.includes('.')) {
      return NextResponse.next();
    }

    // Skip for API routes that don't need auth middleware
    if (pathname.startsWith('/api/auth/middleware') ||
        pathname.startsWith('/api/mercadopago/subscription-webhook') ||
        pathname.startsWith('/api/mercadopago/webhook') ||
        pathname.startsWith('/api/mercadopago/subscription-create') ||
        pathname.startsWith('/api/mercadopago/test-webhook') ||
        pathname.startsWith('/api/mercadopago/webhook-config') ||
        pathname.startsWith('/api/mercadopago/webhook-test') ||
        pathname.startsWith('/api/mercadopago/plans') ||
        pathname.startsWith('/api/locations')) {
      return NextResponse.next();
    }

    // Get user token from cookies or headers
    const userToken = request.cookies.get('auth-token')?.value || 
                     request.headers.get('authorization')?.replace('Bearer ', '');

    if (!userToken) {
      // No user token - continue without middleware checks
      return NextResponse.next();
    }

    // For now, we'll let the client-side auth handle the middleware
    // The middleware will be triggered by the auth context
    return NextResponse.next();

  } catch (error) {
    console.error('❌ [Global Middleware] Error:', error);
    // Continue on error to not break the app
    return NextResponse.next();
  }
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth/middleware (to avoid infinite loops)
     * - api/mercadopago/subscription-webhook (webhook doesn't need auth)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/auth/middleware|api/mercadopago/subscription-webhook|_next/static|_next/image|favicon.ico).*)',
  ],
};
