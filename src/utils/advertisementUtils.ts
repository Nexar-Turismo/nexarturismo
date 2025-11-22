import { BasePost } from '@/types';
import { Advertisement } from '@/components/ui/AdvertisementModal';

export interface PostOrAd {
  type: 'post' | 'ad';
  data: BasePost | Advertisement;
}

/**
 * Calculates how many ads to show based on total number of posts
 * - 1-5 posts: 1 ad (always at least one)
 * - 6-10 posts: 2 ads (1 + 1 more)
 * - 11-15 posts: 3 ads (1 + 2 more)
 * - etc. (1 ad minimum, then 1 more every 5 posts)
 */
function calculateAdCount(totalPosts: number): number {
  if (totalPosts === 0) return 0;
  // Always at least 1 ad, then 1 more for every 5 posts
  // 1-5: 1 ad, 6-10: 2 ads, 11-15: 3 ads, etc.
  return 1 + Math.floor((totalPosts - 1) / 5);
}

/**
 * Inserts advertisements between posts
 * - Always shows at least 1 ad
 * - Shows 1 more ad every 5 posts
 * @param posts Array of posts
 * @param advertisement The advertisement to insert
 * @returns Array of posts and ads interleaved
 */
export function insertAdsBetweenPosts(
  posts: BasePost[],
  advertisement: Advertisement | null
): PostOrAd[] {
  if (!advertisement || posts.length === 0) {
    return posts.map(post => ({ type: 'post' as const, data: post }));
  }

  const totalPosts = posts.length;
  const adCount = calculateAdCount(totalPosts);
  
  if (adCount === 0) {
    return posts.map(post => ({ type: 'post' as const, data: post }));
  }

  // Calculate positions: first ad after first post, then every 5 posts
  const adPositions: number[] = [];
  
  // Always place first ad after the first post (index 0)
  if (totalPosts > 1) {
    adPositions.push(1); // After first post (index 0)
  } else if (totalPosts === 1) {
    // If only 1 post, place ad after it
    adPositions.push(1);
  }
  
  // Then place additional ads every 5 posts (after posts at index 5, 10, 15, etc.)
  for (let i = 1; i < adCount; i++) {
    const position = (i * 5) + 1; // After posts at index 5, 10, 15...
    if (position <= totalPosts) {
      adPositions.push(position);
    }
  }

  // Remove duplicates and sort
  const uniquePositions = [...new Set(adPositions)].sort((a, b) => a - b);
  
  // Debug log
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Ads] Total posts: ${totalPosts}, Ad count: ${adCount}, Positions:`, uniquePositions);
  }

  const result: PostOrAd[] = [];
  let adIndex = 0;
  
  posts.forEach((post, index) => {
    // Add the post
    result.push({ type: 'post', data: post });
    
    // Check if we should insert an ad after this post
    // uniquePositions contains positions (1-based: after post at index 0, 1, 2...)
    if (adIndex < uniquePositions.length && (index + 1) === uniquePositions[adIndex]) {
      result.push({ type: 'ad', data: advertisement });
      adIndex++;
    }
  });

  // Debug: verify ads were inserted
  if (process.env.NODE_ENV === 'development') {
    const insertedAdCount = result.filter(item => item.type === 'ad').length;
    console.log(`[Ads] Actually inserted ${insertedAdCount} ads out of ${adCount} planned`);
  }

  return result;
}

