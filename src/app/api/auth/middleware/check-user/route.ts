import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/services/authMiddleware';

/**
 * Check user subscription status and roles
 * POST /api/auth/middleware/check-user
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log('🔍 [Auth Middleware API] Checking user status:', userId);

    const userStatus = await authMiddleware.checkUserSubscriptionAndRoles(userId);

    return NextResponse.json({
      success: true,
      userStatus
    });

  } catch (error) {
    console.error('❌ [Auth Middleware API] Error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to check user status'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Auth middleware user check endpoint' });
}
