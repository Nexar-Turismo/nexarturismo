import { NextRequest, NextResponse } from 'next/server';
import { firebaseDB } from '@/services/firebaseService';

/**
 * Suspend user account and disable posts if user is a publisher
 * POST /api/user/suspend-account
 * body: { userId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    console.log('🔄 [Suspend Account] Starting account suspension:', userId);

    // Get user data
    const user = await firebaseDB.users.getById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user is a publisher
    const isPublisher = user.roles?.some(role => 
      role.roleName === 'publisher' && role.isActive
    );

    let disabledPostsCount = 0;

    // If user is a publisher, disable all their posts
    if (isPublisher) {
      try {
        console.log('📝 [Suspend Account] Disabling posts for publisher user');
        
        const userPosts = await firebaseDB.posts.getByUserId(userId);
        console.log(`🗑️ [Suspend Account] Found ${userPosts.length} posts to disable`);

        for (const post of userPosts) {
          try {
            await firebaseDB.posts.update(post.id, {
              status: 'inactive',
              deactivatedAt: new Date(),
              deactivationReason: 'account_suspended',
              updatedAt: new Date(),
            });
            console.log(`✅ [Suspend Account] Disabled post: ${post.id}`);
            disabledPostsCount++;
          } catch (error) {
            console.error(`❌ [Suspend Account] Error disabling post ${post.id}:`, error);
          }
        }
      } catch (error) {
        console.error('❌ [Suspend Account] Error processing posts:', error);
      }
    }

    // Update user status to inactive
    await firebaseDB.users.update(userId, {
      isActive: false,
      updatedAt: new Date(),
    });

    console.log('✅ [Suspend Account] Account suspended successfully:', {
      userId,
      userName: user.name,
      disabledPosts: disabledPostsCount
    });

    return NextResponse.json({
      success: true,
      message: 'Cuenta suspendida correctamente',
      disabledPosts: disabledPostsCount
    });

  } catch (error) {
    console.error('❌ [Suspend Account] Error:', error);
    return NextResponse.json(
      { error: 'Error al suspender la cuenta' },
      { status: 500 }
    );
  }
}

