import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/db/mongodb';
import { Post } from '@/lib/models/post';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const topicSlug = searchParams.get('topic');
    const type = searchParams.get('type') as 'conspiracy' | 'opinion' | null;
    const sort = searchParams.get('sort') || 'newest'; // newest, popular, trending, hot, controversial

    const postsCollection = await getCollection<Post>('posts');
    
    const query: any = {
      status: 'published',
    };

    if (topicSlug) {
      query.topicSlug = topicSlug;
    }

    if (type) {
      query.type = type;
    }

    let sortQuery: any = {};
    let useInMemorySort = false;
    const now = new Date();
    
    switch (sort) {
      case 'popular':
        // Most upvotes overall
        sortQuery = { upvotes: -1, createdAt: -1 };
        break;
      case 'trending':
        // Recent posts with high engagement (last 24 hours)
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        query.createdAt = { $gte: oneDayAgo };
        sortQuery = { 
          upvotes: -1,
          commentCount: -1,
          views: -1,
        };
        break;
      case 'hot':
        // Reddit-style hot algorithm: balance between score and time
        // Posts from last 7 days, weighted by engagement
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        query.createdAt = { $gte: sevenDaysAgo };
        useInMemorySort = true;
        sortQuery = { createdAt: -1 }; // Initial sort, will re-sort in memory
        break;
      case 'controversial':
        // High engagement but close upvote/downvote ratio
        useInMemorySort = true;
        sortQuery = { createdAt: -1 }; // Initial sort, will re-sort in memory
        break;
      case 'top':
        // Top posts of all time (score = upvotes - downvotes)
        sortQuery = { upvotes: -1, createdAt: -1 };
        break;
      default: // newest
        sortQuery = { createdAt: -1 };
    }

    const skip = (page - 1) * limit;
    const fetchLimit = useInMemorySort ? Math.min(limit * 3, 100) : limit; // Fetch more for in-memory sorting

    let posts = await postsCollection
      .find(query)
      .sort(sortQuery)
      .limit(fetchLimit)
      .toArray();

    // Apply in-memory sorting for complex algorithms
    if (useInMemorySort) {
      posts = posts.map(post => {
        const score = post.upvotes - post.downvotes;
        const totalVotes = post.upvotes + post.downvotes;
        const hoursSinceCreation = (now.getTime() - post.createdAt.getTime()) / (1000 * 60 * 60);
        
        let sortScore = 0;
        if (sort === 'hot') {
          // Reddit-style hot: log(score) * sign(score) - hours/12
          const sign = score > 0 ? 1 : score < 0 ? -1 : 0;
          const order = Math.log10(Math.max(Math.abs(score), 1));
          sortScore = sign * order - hoursSinceCreation / 12;
        } else if (sort === 'controversial') {
          // Controversial: high total votes but close ratio
          const voteDiff = Math.abs(post.upvotes - post.downvotes);
          sortScore = totalVotes > 0 ? (totalVotes - voteDiff) / totalVotes : 0;
        }
        return { ...post, _sortScore: sortScore };
      });

      posts.sort((a, b) => {
        if (sort === 'hot') {
          return (b as any)._sortScore - (a as any)._sortScore;
        } else if (sort === 'controversial') {
          return (b as any)._sortScore - (a as any)._sortScore;
        }
        return 0;
      });

      // Remove sort score and apply pagination
      posts = posts.slice(skip, skip + limit).map(({ _sortScore, ...post }) => post);
    } else {
      // Apply skip for non-in-memory sorts
      posts = posts.slice(skip, skip + limit);
    }

    const total = await postsCollection.countDocuments(query);

    return NextResponse.json({
      posts: posts.map(post => ({
        ...post,
        _id: post._id?.toString(),
        topicId: post.topicId?.toString(),
        authorId: post.authorId?.toString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
