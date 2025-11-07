import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/db/mongodb';
import { Arena } from '@/lib/models/arena';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = parseInt(searchParams.get('skip') || '0');

    const arenasCollection = await getCollection<Arena>('arenas');
    const query: any = { 'settings.public': true };
    
    if (status) {
      query.status = status;
    }

    const arenas = await arenasCollection
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .toArray();

    return NextResponse.json({
      arenas: arenas.map(a => ({
        ...a,
        _id: a._id?.toString(),
      })),
      total: await arenasCollection.countDocuments(query),
    });
  } catch (error) {
    console.error('Get arenas error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

