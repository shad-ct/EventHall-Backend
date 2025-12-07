# EventHall Backend API

Backend API for EventHall - A platform for discovering campus events.

## Tech Stack

- **Runtime:** Node.js 20+
- **Framework:** Express.js
- **Database:** PostgreSQL (via Prisma ORM)
- **Authentication:** Firebase Admin SDK

## Deployment on Render

### Prerequisites
1. PostgreSQL database (Render provides this)
2. Firebase project with Admin SDK credentials

### Environment Variables Required

```env
DATABASE_URL=postgresql://...
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY=your-private-key
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-frontend-url.netlify.app
ULTIMATE_ADMIN_EMAILS=admin@example.com
```

### Deployment Steps

1. **Create Web Service on Render:**
   - Connect your GitHub repository
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Environment: Node

2. **Add PostgreSQL Database:**
   - Create a PostgreSQL database on Render
   - Copy the Internal Database URL
   - Add as `DATABASE_URL` environment variable

3. **Configure Environment Variables:**
   - Add all required environment variables in Render dashboard
   - Make sure `FIREBASE_PRIVATE_KEY` includes the newlines (`\n`)

4. **Deploy:**
   - Render will automatically build and deploy
   - Database migrations run automatically via `prisma migrate deploy`

## Local Development

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Start development server
npm run dev
```

## API Endpoints

- `GET /health` - Health check
- `POST /api/auth/sync-user` - Sync Firebase user
- `GET /api/events` - List events
- `POST /api/events` - Create event (admin)
- `GET /api/me` - Get current user profile
- `GET /api/admin/*` - Admin endpoints

## Database Schema

See `prisma/schema.prisma` for the complete database schema.
