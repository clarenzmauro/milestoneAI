# Milestone AI - T3 Stack

A modern, full-stack AI-powered planning application built with the T3 Stack.

## 🚀 Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) with App Router
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database**: [PostgreSQL](https://www.postgresql.org/) with [Prisma ORM](https://www.prisma.io/)
- **Authentication**: [NextAuth.js](https://next-auth.js.org/) with Google OAuth
- **API**: [tRPC](https://trpc.io/) for end-to-end type safety
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **AI Integration**: [Google Gemini](https://ai.google.dev/)
- **Database Hosting**: [Supabase](https://supabase.com/)
- **Deployment**: [Vercel](https://vercel.com/)

## 📋 Features

- 🤖 AI-powered plan generation
- 💬 Intelligent chat interface
- 📊 Progress tracking and analytics
- 🏆 Achievement system
- 📱 Responsive design
- 🔐 Secure authentication
- 🔄 Real-time updates
- 📦 Plan management (CRUD operations)

## 🛠️ Development Setup

### Prerequisites

- Node.js 18+ or Bun
- PostgreSQL database
- Supabase account
- Google Gemini API key
- Google OAuth credentials

### Environment Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd milestone-ai-t3
   ```

2. **Install dependencies**
   ```bash
   bun install
   # or
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables**
   Update the `.env` file with your credentials:
   - `DATABASE_URL`: PostgreSQL connection string
   - `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon key
   - `GEMINI_API_KEY`: Google Gemini API key
   - `GOOGLE_CLIENT_ID`: Google OAuth client ID
   - `GOOGLE_CLIENT_SECRET`: Google OAuth client secret

5. **Set up the database**
   ```bash
   # Start PostgreSQL (using Docker or local)
   ./start-database.sh
   
   # Push schema to database
   bun run db:push
   ```

6. **Run the development server**
   ```bash
   bun run dev
   ```

## 📁 Project Structure

```
milestone-ai-t3/
├── src/
│   ├── app/
│   │   ├── api/           # API routes
│   │   ├── auth/          # Authentication pages
│   │   ├── (dashboard)/   # Protected dashboard routes
│   │   └── globals.css    # Global styles
│   ├── components/        # Reusable UI components
│   ├── lib/
│   │   ├── auth/          # NextAuth configuration
│   │   ├── db/            # Database configuration
│   │   ├── env.js         # Environment variables
│   │   └── utils.ts       # Utility functions
│   ├── server/
│   │   ├── api/           # tRPC routers
│   │   └── db.ts          # Database client
│   └── trpc/
│       ├── client.ts      # tRPC client setup
│       ├── query-client.ts # React Query client
│       ├── react.ts       # tRPC React hooks
│       └── server.ts      # tRPC server setup
├── prisma/
│   └── schema.prisma      # Database schema
├── public/               # Static assets
└── .env.example          # Environment variables template
```

## 🗄️ Database Schema

The application uses the following main models:

- **User**: User authentication and profile data
- **Plan**: AI-generated plans with metadata
- **PlanStep**: Individual steps within a plan
- **Conversation**: Chat conversations with AI
- **Message**: Individual messages in conversations
- **Achievement**: User achievements and milestones

## 🚀 Deployment

### Vercel (Recommended)

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. **Deploy to Vercel**
   - Import your repository on [Vercel](https://vercel.com)
   - Add environment variables in Vercel dashboard
   - Deploy

### Docker

```bash
# Build the image
docker build -t milestone-ai-t3 .

# Run the container
docker run -p 3000:3000 --env-file .env milestone-ai-t3
```

## 🔧 Available Scripts

- `bun run dev` - Start development server
- `bun run build` - Build for production
- `bun run start` - Start production server
- `bun run db:push` - Push schema to database
- `bun run db:studio` - Open Prisma Studio
- `bun run lint` - Run ESLint
- `bun run format:write` - Format code with Prettier

## 🧪 Testing

```bash
# Run tests
bun run test

# Run tests in watch mode
bun run test:watch

# Run tests with coverage
bun run test:coverage
```

## 📚 Documentation

- [T3 Stack Documentation](https://create.t3.gg/)
- [Next.js Documentation](https://nextjs.org/docs)
- [tRPC Documentation](https://trpc.io/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
