import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/db/mongodb';
import { NFT } from '@/lib/models/nft';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rarity = searchParams.get('rarity');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = parseInt(searchParams.get('skip') || '0');

    const nftsCollection = await getCollection<NFT>('nfts');
    const query: any = { 'marketplace.listed': true };

    if (rarity) {
      query['metadata.rarity'] = rarity;
    }

    const nfts = await nftsCollection
      .find(query)
      .sort({ 'marketplace.listedAt': -1 })
      .limit(limit)
      .skip(skip)
      .toArray();

    return NextResponse.json({
      nfts: nfts.map(nft => ({
        ...nft,
        _id: nft._id?.toString(),
      })),
      total: await nftsCollection.countDocuments(query),
    });
  } catch (error) {
    console.error('Get marketplace NFTs error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

