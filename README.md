# Dotdot - AI Personal Assistant

A modern AI personal assistant powered by DeepSeek V3 with advanced memory management and knowledge base features.

## Features

- **Intelligent Conversations** - Stream responses powered by DeepSeek V3
- **Long-term Memory** - Semantic search with MemMachine integration
- **Knowledge Base** - Upload and index documents (PDF, images) with OCR
- **Multi-user Support** - JWT authentication with data isolation
- **Web Search** - Integrated Tavily API for real-time information
- **Modern UI** - Beautiful, responsive interface built with Next.js 14

## Quick Start

### Prerequisites

- Node.js 20+
- Docker (optional, for MemMachine)

### Installation

1. Clone the repository
```bash
git clone https://github.com/BH1IXO/Dotdot.git
cd Dotdot
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
```

Edit `.env` and add your API keys:
```env
OPENAI_API_KEY=your-deepseek-api-key
OPENAI_API_BASE=https://api.deepseek.com/v1
JWT_SECRET=your-jwt-secret
```

4. Initialize database
```bash
npx prisma db push
```

5. Start development server
```bash
npm run dev
```

Visit http://localhost:3000

## Deployment

### Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. Push to GitHub
2. Import to Vercel
3. Configure environment variables
4. Deploy

### Docker

```bash
docker-compose up -d
```

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **AI Model**: DeepSeek V3
- **Memory System**: MemMachine
- **Database**: SQLite (default) / PostgreSQL
- **Authentication**: JWT + bcrypt
- **Styling**: Tailwind CSS

## Architecture

```
Frontend (Next.js)
    ↓
API Routes
    ↓
┌────────────────┬──────────────────┐
DeepSeek V3      MemMachine          SQLite/PostgreSQL
(Conversations)  (Semantic Memory)   (User Data)
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | DeepSeek API key | Yes |
| `OPENAI_API_BASE` | DeepSeek API base URL | Yes |
| `JWT_SECRET` | Secret for JWT tokens | Yes |
| `MEMMACHINE_URL` | MemMachine server URL | No |
| `TAVILY_API_KEY` | Tavily search API key | No |
| `DATABASE_URL` | Database connection URL | No |

## Development

```bash
npm run dev         # Start development server
npm run build       # Build for production
npm run start       # Start production server
npm run db:push     # Sync database schema
npm run db:studio   # Open Prisma Studio
```

## Project Structure

```
Dotdot/
├── app/                 # Next.js App Router
│   ├── api/            # API endpoints
│   ├── components/     # React components
│   └── contexts/       # React contexts
├── lib/                # Utilities
├── prisma/             # Database schema
├── public/             # Static files
└── docs/               # Documentation
```

## Roadmap

- [x] Phase 1: Basic chat system
- [x] Phase 2: MemMachine integration
- [x] Phase 3: File upload & knowledge base
- [x] Phase 4: Multi-user support
- [ ] Phase 5: Advanced features (Voice, Mobile, API)

## License

MIT License

## Author

**BH1IXO**

---

**Version**: 4.0.0 (Multi-user Complete)
**Last Updated**: 2025-01-08
