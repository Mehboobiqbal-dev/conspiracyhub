import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { getCollection } from '@/lib/db/mongodb';
import { Vote } from '@/lib/models/vote';
import { Post } from '@/lib/models/post';
import { Comment } from '@/lib/models/comment';
import { z } from 'zod';
import { ObjectId } from 'mongodb';

const voteSchema = z.object({
  postId: z.string().optional(),
  commentId: z.string().optional(),
  type: z.enum(['upvote', 'downvote']),
});

async function handler(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = voteSchema.parse(body);
    const userId = (request as any).user.userId;

    console.log('[votes] incoming', {
      body,
      validated,
      userId,
    });

    if (!validated.postId && !validated.commentId) {
      return NextResponse.json(
        { error: 'Either postId or commentId is required' },
        { status: 400 }
      );
    }

    const votesCollection = await getCollection<Vote>('votes');

    // Check if user already voted
    const existingVote = await votesCollection.findOne({
      userId: userId as any,
      ...(validated.postId ? { postId: validated.postId as any } : { commentId: validated.commentId as any }),
    });

    console.log('[votes] existingVote', existingVote);

    if (existingVote) {
      // If same vote type, remove it (toggle off)
      if (existingVote.type === validated.type) {
        await votesCollection.deleteOne({ _id: existingVote._id });

        // Decrement vote count
        if (validated.postId) {
          const postsCollection = await getCollection<Post>('posts');
          const res = await postsCollection.updateOne(
            { _id: new ObjectId(validated.postId) },
            { $inc: { [validated.type === 'upvote' ? 'upvotes' : 'downvotes']: -1 } }
          );
          console.log('[votes] post decrement result', res.modifiedCount);
        } else if (validated.commentId) {
          const commentsCollection = await getCollection<Comment>('comments');
          const res = await commentsCollection.updateOne(
            { _id: new ObjectId(validated.commentId!) },
            { $inc: { [validated.type === 'upvote' ? 'upvotes' : 'downvotes']: -1 } }
          );
          console.log('[votes] comment decrement result', res.modifiedCount);
        }

        return NextResponse.json({ message: 'Vote removed', voted: false });
      } else {
        // Change vote type
        await votesCollection.updateOne(
          { _id: existingVote._id },
          { $set: { type: validated.type } }
        );

        // Update vote counts
        if (validated.postId) {
          const postsCollection = await getCollection<Post>('posts');
          const res = await postsCollection.updateOne(
            { _id: new ObjectId(validated.postId) },
            {
              $inc: {
                [existingVote.type === 'upvote' ? 'upvotes' : 'downvotes']: -1,
                [validated.type === 'upvote' ? 'upvotes' : 'downvotes']: 1,
              },
            }
          );
          console.log('[votes] post change result', res.modifiedCount);
        } else if (validated.commentId) {
          const commentsCollection = await getCollection<Comment>('comments');
          const res = await commentsCollection.updateOne(
            { _id: new ObjectId(validated.commentId!) },
            {
              $inc: {
                [existingVote.type === 'upvote' ? 'upvotes' : 'downvotes']: -1,
                [validated.type === 'upvote' ? 'upvotes' : 'downvotes']: 1,
              },
            }
          );
          console.log('[votes] comment change result', res.modifiedCount);
        }

        return NextResponse.json({ message: 'Vote updated', voted: true, type: validated.type });
      }
    }

    // Create new vote
    const newVote: Omit<Vote, '_id'> = {
      postId: validated.postId ? (validated.postId as any) : undefined,
      commentId: validated.commentId ? (validated.commentId as any) : undefined,
      userId: userId as any,
      type: validated.type,
      createdAt: new Date(),
    };

    const insertRes = await votesCollection.insertOne(newVote as Vote);
    console.log('[votes] newVote inserted', insertRes.insertedId?.toString());

    // Increment vote count
    if (validated.postId) {
      const postsCollection = await getCollection<Post>('posts');
      const res = await postsCollection.updateOne(
        { _id: new ObjectId(validated.postId) },
        { $inc: { [validated.type === 'upvote' ? 'upvotes' : 'downvotes']: 1 } }
      );
      console.log('[votes] post increment result', res.modifiedCount);
    } else if (validated.commentId) {
      const commentsCollection = await getCollection<Comment>('comments');
      const res = await commentsCollection.updateOne(
        { _id: new ObjectId(validated.commentId!) },
        { $inc: { [validated.type === 'upvote' ? 'upvotes' : 'downvotes']: 1 } }
      );
      console.log('[votes] comment increment result', res.modifiedCount);
    }

    return NextResponse.json({ message: 'Vote recorded', voted: true, type: validated.type });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error processing vote:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = requireAuth(handler);

