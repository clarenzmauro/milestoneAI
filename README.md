# MilestoneAI

A comprehensive 90-day goal planning application powered by Google's Gemini 2.5 Flash AI model.

## Features

- **AI-Powered Planning**: Generate detailed 90-day plans using Gemini 2.5 Flash
- **Interactive Chat**: Discuss and refine your plans with AI assistance
- **Progress Tracking**: Monitor your daily, weekly, and monthly milestones
- **Real-time Updates**: Dynamic plan modifications through conversational AI

## Tech Stack

- **Frontend**: React 19 with TypeScript
- **Backend**: Node.js with Express
- **AI Model**: Google Gemini 2.5 Flash (via Google AI Studio)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with Google OAuth
- **Package Manager**: Bun (for improved performance and security)

## Advanced AI Configuration

This project uses optimized Gemini 2.5 Flash configurations for different use cases:

### Plan Generation Configuration
- **Temperature**: 0.5 (more deterministic for structured plans)
- **TopK**: 20 (focused token selection)
- **TopP**: 0.9 (conservative nucleus sampling)
- **Thinking Budget**: 24576 tokens (maximum reasoning capability for comprehensive planning)

### Chat Configuration  
- **Temperature**: 0.8 (more creative for conversations)
- **TopK**: 50 (broader token selection)
- **TopP**: 0.95 (standard nucleus sampling)
- **Thinking Budget**: 1024 tokens (quick responses)

### Thinking Features
- **Thinking Budget**: Configurable token allocation for internal reasoning
- **Include Thoughts**: Option to expose model's reasoning process (disabled by default)
- **Automatic vs Manual**: Can be set to automatic (-1) or specific token amounts

## Prerequisites

- [Bun](https://bun.sh) (latest version)
- Google AI Studio API Key
- Supabase Project

## Database Migration (Firebase → Supabase)

This project has been migrated from Firebase to Supabase for better developer experience and PostgreSQL features.

### Setting up Supabase

1. **Create a new Supabase project**
   - Go to [Supabase](https://supabase.com) and create an account
   - Create a new project and note your project URL and anon key

2. **Set up the database schema**
   - In your Supabase dashboard, go to the SQL Editor
   - Copy and paste the contents of `supabase-schema.sql` into the editor
   - Run the SQL to create the plans table and policies

3. **Configure Google OAuth**
   - In Supabase dashboard, go to Authentication → Providers
   - Enable Google provider
   - Add your Google OAuth client ID and secret
   - Set the redirect URL to your domain (e.g., `http://localhost:3000` for development)

4. **Update environment variables**
   - Copy `client/.env.example` to `client/.env`
   - Replace the placeholder values with your actual Supabase credentials

### Migration Notes

- **Authentication**: Switched from Firebase Auth to Supabase Auth
- **Database**: Migrated from Firestore to PostgreSQL with Row Level Security
- **Data Structure**: Plans are now stored in a relational table with JSON columns for complex data
- **Real-time**: Supabase provides real-time subscriptions if needed in the future

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/clarenzmauro/milestoneAI.git
   cd milestoneAI
   ```

2. **Install dependencies for all packages**
   ```bash
   bun run install:all
   ```

3. **Set up environment variables**
   
   Create `server/.env`:
   ```env
   GEMINI_API_KEY=your_google_ai_studio_api_key
   PORT=3001
   ```

   Create `client/.env`:
   ```env
   REACT_APP_SUPABASE_URL=your_supabase_project_url
   REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
   REACT_APP_GEMINI_API_KEY=your_gemini_api_key
   REACT_APP_BACKEND_URL=http://localhost:3001/api
   ```

## Running the Application

### Development Mode
```bash
# Run both client and server concurrently
bun dev

# Or run individually:
bun run dev:server  # Server with hot reload
bun run start:client  # React development server
```

### Production Mode
```bash
# Build client
bun run build:client

# Start server only (serve built client separately)
bun run start:server
```

### Individual Commands
```bash
# Server only
bun run start:server

# Client only  
bun run start:client
```

## Project Structure

```
milestoneAI/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── services/      # API services
│   │   ├── types/         # TypeScript types
│   │   └── contexts/      # React contexts
│   └── package.json
├── server/                # Express backend
│   ├── server.js         # Main server file
│   ├── .env              # Environment variables
│   └── package.json
└── package.json          # Root package.json with scripts
```

## API Endpoints

- `POST /api/generate-plan` - Generate a new 90-day plan
- `POST /api/chat` - Chat with AI about your plan

## Migration from NPM to Bun

This project has been migrated from npm to Bun for:
- **Faster installations**: Up to 10x faster than npm
- **Better security**: Updated dependencies to fix vulnerabilities
- **Improved performance**: Faster build times and development server
- **Modern tooling**: Native TypeScript support and better DX

### Security Improvements
- ✅ Fixed `nth-check` RegExp complexity vulnerability
- ✅ Resolved webpack-dev-server security issues  
- ✅ Updated PostCSS to fix parsing errors
- ✅ Fixed brace-expansion ReDoS vulnerability
- ✅ Removed unused `openai` dependency

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.
