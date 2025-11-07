import { ObjectId } from 'mongodb';

export interface NFT {
  _id?: ObjectId;
  tokenId: string;
  ownerId: ObjectId;
  name: string;
  description: string;
  imageUrl: string;
  metadata: {
    achievement: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    attributes: Array<{
      trait_type: string;
      value: string | number;
    }>;
  };
  source: {
    type: 'tournament' | 'arena' | 'achievement' | 'purchase';
    sourceId?: ObjectId;
    tournamentId?: ObjectId;
    arenaId?: ObjectId;
  };
  blockchain: {
    network: 'solana';
    mintAddress: string;
    transactionHash: string;
    mintedAt: Date;
  };
  marketplace: {
    listed: boolean;
    price?: number;
    currency: 'SOL' | 'USDC';
    listedAt?: Date;
    soldAt?: Date;
    buyerId?: ObjectId;
  };
  createdAt: Date;
  updatedAt: Date;
}

