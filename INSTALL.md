# Installation & Setup Guide

Follow these steps to get the application running locally.

## Prerequisites

- [Node.js](https://nodejs.org/) (v20+ recommended)
- [Docker Desktop](https://www.docker.com/products/docker-desktop) (required for Supabase and backend containerization)
- [Supabase CLI](https://supabase.com/docs/guides/cli/getting-started) (optional but recommended for local development)

## 1. Install Dependencies

Run the following command in the root directory to install dependencies for all workspaces:

```bash
npm install
```

## 2. Start Supabase (Local Database)

Initialize and start the local Supabase instance. Ensure Docker is running.

```bash
npx supabase start
```

Once started, you will see output containing your API URL and keys. You will need these for the next step.

## 3. Configure Environment Variables

### Frontend (`apps/web`)

Create a `.env.local` file in `apps/web/`:

```bash
# apps/web/.env.local
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_from_step_2
```

### Backend (`apps/backend`)

Create a `.env` file in `apps/backend/`:

```bash
# apps/backend/.env
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=your_anon_key_from_step_2
PORT=3001
```

## 4. Run the Application

You can run the frontend and backend separately or together.

### Run Everything (TurboRepo)

If you have `turbo` installed globally or want to use `npx`:

```bash
npx turbo dev
```

### Run Individually

**Frontend (Web):**
```bash
npm run dev -w apps/web
# Access at http://localhost:3000
```

**Backend (API):**
```bash
npm run dev -w apps/backend
# Access at http://localhost:3001
```
