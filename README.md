# Opinion Arena Network (OAN)

A Next.js-based platform for structured debates, opinion sharing, and bias awareness.

## Features

- **Echo Chamber Simulator**: Identify and break out of bias bubbles
- **Multiplayer Arenas**: Real-time structured debates
- **Global Tournaments**: Competitive opinion-based events
- **Opinion Guilds**: Themed communities for discussions
- **Time Capsules**: Seal opinions for future reflection
- **Analytics Dashboards**: Personal and global bias insights
- **AI Moderation**: Automated content filtering
- **NFT Marketplace**: Gamified achievements
- **SDK/API**: Extensible platform for developers

## Tech Stack

- **Framework**: Next.js 15.3.3
- **Database**: MongoDB Atlas
- **Cache**: Redis
- **Authentication**: JWT with OAuth2 support
- **AI**: Google Genkit
- **Blockchain**: Solana (for NFTs and time capsules)

## Getting Started

### Prerequisites

- Node.js 20+
- MongoDB instance
- Redis instance

### Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Copy `.env.example` to `.env.local` and fill in your configuration:
```bash
cp .env.example .env.local
```

4. Run the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:9002`

## Environment Variables

See `.env.example` for all required environment variables.

Key variables:
- `MONGODB_URI`: MongoDB connection string
- `REDIS_URL`: Redis connection string
- `JWT_SECRET`: Secret for JWT tokens
- `ENCRYPTION_KEY`: Key for data encryption
- `GOOGLE_GENAI_API_KEY`: Google Genkit API key

## API Documentation

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for complete API reference.

## Project Structure

```
src/
├── app/
│   ├── api/          # API routes
│   └── (app)/        # App pages
├── components/        # React components
├── lib/
│   ├── auth/         # Authentication utilities
│   ├── db/           # Database connections
│   ├── models/       # MongoDB models
│   └── middleware/   # Auth middleware
└── ai/               # AI flows (Genkit)
```

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run linter
- `npm run typecheck` - Type check

## License

Private - All rights reserved

