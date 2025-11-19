import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/services/authMiddleware';

/**
 * Check if user has permission to perform an action
 * POST /api/auth/middleware/check-permission
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, action } = body;

    if (!userId || !action) {
      return NextResponse.json({ error: 'User ID and action are required' }, { status: 400 });
    }

    if (!['create_post', 'create_booking', 'publish'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    console.log('🔍 [Auth Middleware API] Checking permission:', { userId, action });

    const result = await authMiddleware.checkUserPermission(userId, action as any);

    return NextResponse.json({
      success: true,
      allowed: result.allowed,
      reason: result.reason,
      userStatus: result.userStatus
    });

  } catch (error) {
    console.error('❌ [Auth Middleware API] Error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to check permission'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Auth middleware permission check endpoint' });
}
