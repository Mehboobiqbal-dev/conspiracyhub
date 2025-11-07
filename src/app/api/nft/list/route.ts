import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { getCollection } from '@/lib/db/mongodb';
import { NFT } from '@/lib/models/nft';
import { z } from 'zod';

const listSchema = z.object({
  nftId: z.string().min(1),
  price: z.number().min(0),
  currency: z.enum(['SOL', 'USDC']).default('SOL'),
});

async function handler(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = listSchema.parse(body);
    const userId = (request as any).user.userId;

    const nftsCollection = await getCollection<NFT>('nfts');
    const nft = await nftsCollection.findOne({ 
      _id: validated.nftId as any,
      ownerId: userId as any,
    });

    if (!nft) {
      return NextResponse.json(
        { error: 'NFT not found or not owned by you' },
        { status: 404 }
      );
    }

    if (nft.marketplace.listed) {
      return NextResponse.json(
        { error: 'NFT is already listed' },
        { status: 400 }
      );
    }

    await nftsCollection.updateOne(
      { _id: nft._id },
      {
        $set: {
          'marketplace.listed': true,
          'marketplace.price': validated.price,
          'marketplace.currency': validated.currency,
          'marketplace.listedAt': new Date(),
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      message: 'NFT listed successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('List NFT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = requireAuth(handler);

