# Lyceum Backend

The Node.js/Express API server that powers The Lyceum Project's AI-driven learning features.

## Overview

This backend provides:

- **AI Services**: Path generation, lab creation, assistant conversations using OpenAI/Ollama
- **Learning Engine**: Module progress, mastery tracking, path sequencing  
- **User Management**: Profile data, settings sync, authentication support
- **Content Generation**: Dynamic lab creation and adaptive content
- **Analytics**: Dashboard data, progress analytics, success rate calculation
- **Notifications**: Learning reminders, milestone alerts, email notifications
- **Waitlist**: Email collection with confirmation emails via Resend
- **Source Registry**: Integration with educational content sources (optional)

## Tech Stack

- **Framework**: Node.js with Express
- **Database**: Supabase (PostgreSQL) 
- **Authentication**: Supabase Auth integration
- **AI Models**: OpenAI GPT-4o or local Ollama models
- **Email**: Resend for transactional emails
- **Content**: Firecrawl for web scraping (optional)

## Development Setup

### Prerequisites

- Node.js 20.18+
- pnpm 9.15+
- Supabase CLI (for local development)

### Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
# Database
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI Configuration  
OPENAI_API_KEY=your_openai_key
OPENAI_MODEL=gpt-4o

# OR use local Ollama
USE_OLLAMA=true
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_MODEL=gpt-oss:120b-cloud

# Email (Optional)
RESEND_API_KEY=your_resend_key
WAITLIST_FROM_EMAIL=onboarding@resend.dev

# Features (Optional)
USE_FIRECRAWL=true
FIRECRAWL_API_KEY=your_firecrawl_key
ENABLE_SOURCE_REGISTRY=false
```

### Getting Started

```bash
# Install dependencies
pnpm install

# Start development server  
pnpm dev

# Server runs on http://localhost:8080
```

## API Routes

### Public Routes
- `POST /waitlist` - Waitlist signup with email confirmation
- `POST /learn-by-doing` - Generate learn-by-doing content (streaming)

### Protected Routes (require authentication)
- `POST /ai/chat` - AI assistant conversations
- `GET|POST /dashboard/*` - Dashboard data and analytics
- `GET|POST /labs/*` - Lab management and content
- `GET|POST /paths/*` - Learning path generation and management  
- `GET|POST /notifications/*` - User notification preferences

### Admin Routes (when enabled)
- `GET|POST /registry/*` - Source registry management

## Key Features

### AI-Powered Learning

The backend integrates with multiple AI providers:

- **OpenAI**: Production-ready with GPT-4o for high-quality content
- **Ollama**: Local development with open-source models
- **Gemini**: Alternative provider for specific use cases

### Waitlist with Email Confirmations

When users sign up for the waitlist:

1. **Validation**: Email format and duplicate checking
2. **Database**: Stored in `waitlist_signups` table with metadata
3. **Email**: Beautiful HTML confirmation email via Resend
4. **Analytics**: Source tracking for signup attribution

### Learning Path Generation

Dynamic learning path creation with:

- AI-generated course outlines based on user interests
- Integration with trusted educational sources
- Module sequencing and difficulty progression  
- Lab generation with interactive widgets
- Progress tracking with completion/mastery semantics

### Source Registry (Optional)

When enabled, provides:

- Educational content discovery and validation
- TOC extraction from textbooks and courses
- Module grounding with trusted sources
- Content synthesis and citation building

## Deployment

### Environment Configuration

For production:

```bash
NODE_ENV=production
PORT=8080
SUPABASE_URL=your_production_supabase_url
# ... other production values
```

### Docker Build

```bash
docker build -t lyceum-backend .
docker run -p 8080:8080 lyceum-backend
```

### Vercel/Railway Deploy

The backend can be deployed to any Node.js hosting platform:

- Set environment variables in your platform
- Ensure database migrations are run
- Configure CORS for your frontend domains

## Monitoring & Logging

The backend includes structured logging for:

- API request/response monitoring
- AI service calls and token usage
- Email delivery status
- Error tracking and debugging
- User activity analytics

## Contributing

See the main project [INSTALL.md](../../INSTALL.md) for setup instructions and [lyceum.md](../../lyceum.md) for architecture details.

### Development Commands

```bash
# Development
pnpm dev              # Start with hot reload

# Building  
pnpm build           # Compile TypeScript
pnpm start           # Start production server

# Registry (when enabled)
pnpm registry:scan   # Scan educational sources
pnpm registry:list   # List available sources
```

## Troubleshooting

### Common Issues

- **Database Connection**: Ensure Supabase is running locally or credentials are correct
- **AI Services**: Verify API keys and model availability
- **Email Sending**: Check Resend API key and domain verification
- **Port Conflicts**: Default port 8080, change PORT env var if needed

### Performance

- **Caching**: Implement Redis for frequently accessed data
- **Rate Limiting**: Built-in protection for AI API calls
- **Queuing**: Consider Bull/BullMQ for background jobs
- **Monitoring**: Use tools like Sentry for error tracking

For detailed setup instructions, see [RESEND_SETUP.md](../../RESEND_SETUP.md) for email configuration.