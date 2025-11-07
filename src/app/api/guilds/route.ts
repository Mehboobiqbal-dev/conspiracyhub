import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/db/mongodb';
import { Guild } from '@/lib/models/guild';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const theme = searchParams.get('theme');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = parseInt(searchParams.get('skip') || '0');

    const guildsCollection = await getCollection<Guild>('guilds');
    const query: any = { 'settings.public': true };
    
    if (theme) {
      query.theme = theme;
    }

    const guilds = await guildsCollection
      .find(query)
      .sort({ 'stats.activeMembers': -1 })
      .limit(limit)
      .skip(skip)
      .toArray();

    return NextResponse.json({
      guilds: guilds.map(g => ({
        ...g,
        _id: g._id?.toString(),
      })),
      total: await guildsCollection.countDocuments(query),
    });
  } catch (error) {
    console.error('Get guilds error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

