# Elch - Conspiracy & Opinion Platform

A Reddit/Quora-style platform focused on conspiracy theories and opinions, powered by AI-generated content and user submissions.

## 🎯 Core Features

### Content Types
- **Conspiracy Theories**: AI-generated and user-submitted conspiracy theories
- **Opinions**: User-shared opinions on various topics
- **Topics/Categories**: Organized content by subject matter
- **Comments**: Threaded discussion system
- **Voting**: Upvote/downvote system for posts and comments

### Authentication
- **Public Access**: Read all content without login
- **Authenticated Access**: Required to create posts, comment, and vote
- JWT-based authentication with refresh tokens

### AI Integration
- **Gemini AI**: Automatically generates conspiracy theories on current and historical topics
- **Auto-Generation**: Scheduled content generation for trending topics
- **Smart Tagging**: Automatic categorization and tagging

### SEO Optimization
- Server-side rendering (SSR) for all public pages
- Dynamic metadata for each post/topic
- Structured data (JSON-LD)
- Sitemap generation
- Open Graph tags
- Canonical URLs

## 🚀 Tech Stack

- **Framework**: Next.js 15.3.3 (App Router)
- **Database**: MongoDB
- **Cache**: Redis (optional)
- **Authentication**: JWT
- **AI**: Google Gemini via Genkit
- **UI**: Tailwind CSS + shadcn/ui
- **Language**: TypeScript

## 📦 Installation

1. Clone the repository
```bash
git clone <repository-url>
cd opinion-arena-network
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env.local
```

Required environment variables:
```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
GOOGLE_GENAI_API_KEY=your_gemini_api_key
AI_GENERATION_API_KEY=your_ai_generation_api_key
NEXT_PUBLIC_BASE_URL=http://localhost:9002
```

4. Run the development server
```bash
npm run dev
```

The app will be available at `http://localhost:9002`

## 📁 Project Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── api/               # API routes
│   │   ├── auth/         # Authentication endpoints
│   │   ├── posts/        # Post CRUD operations
│   │   ├── topics/       # Topic management
│   │   ├── comments/     # Comment system
│   │   ├── votes/        # Voting system
│   │   └── ai/           # AI generation endpoints
│   ├── p/[slug]/         # Post detail page (SSR)
│   ├── t/[slug]/         # Topic page (SSR)
│   ├── u/[id]/           # User profile (SSR)
│   ├── create/           # Create post (auth required)
│   ├── search/           # Search page
│   ├── trending/         # Trending posts
│   └── topics/           # Topics list
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── comment-section.tsx
│   ├── post-feed.tsx
│   ├── post-vote-buttons.tsx
│   └── main-nav.tsx
├── lib/
│   ├── models/           # MongoDB models
│   ├── auth/             # Authentication utilities
│   ├── db/               # Database connections
│   └── middleware/       # Auth middleware
├── contexts/             # React contexts
│   └── auth-context.tsx
└── ai/
    ├── genkit.ts         # Gemini AI setup
    └── flows/            # AI generation flows
```

## 🔑 Key Features

### Public Pages (No Auth Required)
- Home feed with latest posts
- Post detail pages
- Topic pages
- Topics list
- Search functionality
- Trending posts
- User profiles

### Authenticated Pages
- Create new posts
- Comment on posts
- Vote on posts/comments
- User dashboard
- Settings

### AI Features
- Automatic conspiracy theory generation
- Topic-based content creation
- Historical and current event coverage
- Smart content tagging

## 🤖 AI Auto-Generation

The platform includes an AI auto-generation system that creates conspiracy theories:

1. **Manual Generation**: POST to `/api/ai/generate-post`
2. **Batch Generation**: GET `/api/ai/auto-generate` (requires API key)
3. **Scheduled Generation**: Set up a cron job to call the auto-generate endpoint

Example cron job (daily at 2 AM):
```bash
0 2 * * * curl -X GET "https://your-domain.com/api/ai/auto-generate" -H "Authorization: Bearer YOUR_API_KEY"
```

## 📊 Database Collections

- `users` - User accounts
- `posts` - Posts/theories
- `topics` - Topic categories
- `comments` - Post comments
- `votes` - User votes

## 🔒 Security

- JWT-based authentication
- HTTP-only cookies for tokens
- Password hashing with bcrypt
- Input validation with Zod
- Rate limiting (recommended for production)

## 🚀 Deployment

1. Build the application
```bash
npm run build
```

2. Start production server
```bash
npm start
```

3. Set up environment variables on your hosting platform
4. Configure MongoDB connection
5. Set up cron jobs for AI auto-generation (optional)

## 📝 License

Private project

## 🤝 Contributing

This is a private project. Contributions are not currently accepted.
