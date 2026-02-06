# BasicsTutor

AI-powered educational platform that breaks down complex topics into fundamental first principles using Google's Gemini AI.

## 🌟 Features

- **AI-Generated Learning Content** - Comprehensive topic breakdowns with principles, explanations, and analogies
- **Interactive Quizzes** - Knowledge assessment with instant feedback
- **Mind Maps** - Visual learning with automatically generated topic mind maps
- **Progress Tracking** - Spaced repetition and mastery tracking for each principle
- **Pro Subscription** - Premium features via Stripe integration
- **Admin Dashboard** - Platform management and analytics
- **Support System** - Built-in support request management
- **AI Tutor Chat** - Personalized learning assistance

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Wouter** for routing
- **TanStack React Query** for server state management
- **Tailwind CSS** + **shadcn/ui** for styling
- **Radix UI** for accessible components
- **Recharts** for analytics visualization
- **XYFlow** for mind map visualization

### Backend
- **Node.js 20** with TypeScript
- **Express.js** web server
- **PostgreSQL** database
- **Drizzle ORM** for database management
- **Passport.js** with Google OAuth 2.0
- **Stripe** for payments
- **Google Gemini 2.5 Flash** for AI content generation
- **BullMQ** + **Redis** for background job processing

### Testing
- **Vitest** for unit and integration testing
- **Playwright** for end-to-end testing
- **Supertest** for API testing

## 📋 Prerequisites

- **Node.js** 18+ (20 recommended)
- **PostgreSQL** 14+
- **Redis** 6+ (for job queue)
- **Google Cloud Account** (for OAuth & Gemini API)
- **Stripe Account** (for payments)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd basicstutor/basics
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and fill in your credentials. See [Environment Variables](#environment-variables) section below.

### 4. Database Setup

```bash
# Push database schema
npm run db:push

# Or run migrations manually
npm run migrate
```

### 5. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5000`

## 🔧 Environment Variables

Create a `.env` file in the root directory. See `.env.example` for a template.

### Required Variables

#### Database
```env
DATABASE_URL=postgresql://user:password@localhost:5432/basicstutor
REDIS_URL=redis://localhost:6379
```

#### Authentication
```env
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
SESSION_SECRET=generate_with_openssl_rand_base64_32
```

**Generate SESSION_SECRET**:
```bash
openssl rand -base64 32
```

#### Admin Access
```env
ADMIN_EMAILS=admin@example.com,admin2@example.com
```

#### Payments (Stripe)
```env
STRIPE_SECRET_KEY=sk_test_your_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

#### AI Integration (Gemini)
```env
GOOGLE_API_KEY=your_gemini_api_key_here
```

### Optional Configuration

```env
# Pricing (in cents)
TOPIC_PRICE_CENTS=199
PRO_ANNUAL_PRICE_CENTS=9900

# Quiz Settings
QUIZ_PASSING_SCORE=70
QUESTIONS_PER_QUIZ=5

# Limits
FREE_TOPICS_LIMIT=1

# Application
NODE_ENV=development
PORT=5000
```

## 📚 Available Scripts

```bash
# Development
npm run dev          # Start development server with hot reload

# Building
npm run build        # Build for production
npm run start        # Run production server

# Testing
npm test             # Run tests in watch mode
npm run test:run     # Run tests once
npm run test:ui      # Open test UI in browser
npm run test:coverage # Generate coverage report

# Database
npm run db:push      # Push schema changes to database

# Type Checking
npm run check        # Run TypeScript type checking
```

## 🗄️ Database Schema

The application uses PostgreSQL with the following main tables:

- **users** - User profiles and authentication
- **topics** - Generated learning topics
- **principles** - Core concepts within topics
- **quizzes** - Quiz instances
- **questions** - Quiz questions and answers
- **progress** - User learning progress
- **quiz_attempts** - Quiz performance analytics
- **principle_mastery** - Mastery tracking per principle
- **review_schedule** - Spaced repetition scheduling
- **tutor_sessions** - AI tutor chat sessions
- **tutor_messages** - Chat message history
- **topic_purchases** - Purchase records
- **support_requests** - Support tickets
- **support_messages** - Support ticket messages

## 🔐 Authentication

The app uses **Google OAuth 2.0** for authentication:

1. Create OAuth 2.0 credentials at [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Add authorized redirect URI: `http://localhost:5000/api/auth/google/callback` (development)
3. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`

## 💳 Stripe Integration

### Setup

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Get your API keys from [Dashboard > API Keys](https://dashboard.stripe.com/apikeys)
3. Set up webhooks at [Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
   - Endpoint: `http://localhost:5000/api/stripe/webhook` (development)
   - Event: `checkout.session.completed`

### Testing Payments

Use Stripe test cards:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`

## 🤖 AI Integration

The platform uses **Google Gemini 2.5 Flash** for content generation:

1. Get API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Set `GOOGLE_API_KEY` in `.env`

### Safety Features

- Prompt injection prevention
- Content validation
- Safety settings for harassment, hate speech, explicit content

## 📈 Admin Features

Access the admin dashboard at `/admin` (requires admin email in `ADMIN_EMAILS`):

- User management (view, promote to admin/pro)
- Topic management (view all, delete)
- Support ticket management
- Purchase history
- Analytics dashboard

## 🧪 Testing

### Unit Tests

```bash
npm test
```

Tests are located in `server/__tests__/`:
- `validation.test.ts` - Input validation schemas (48 tests)
- `errors.test.ts` - Error handling (21 tests)
- `routes.integration.test.ts` - API endpoint tests

### E2E Tests

```bash
npx playwright test
```

E2E tests are in `e2e/`:
- `auth.spec.ts` - Authentication flows
- `home.spec.ts` - Homepage interactions

### Coverage

```bash
npm run test:coverage
```

Target: 70%+ coverage on critical paths

## 🚀 Deployment

### Railway

See [RAILWAY.md](RAILWAY.md) for detailed deployment instructions.

### Docker

```bash
docker build -t basicstutor .
docker run -p 5000:5000 --env-file .env basicstutor
```

### Replit

See [replit.md](replit.md) for Replit-specific setup.

## 📝 API Documentation

### Public Endpoints

- `GET /api/topics` - List public topics
- `GET /api/topics/:slug` - Get topic details
- `POST /api/topics/generate` - Generate new topic (anonymous allowed)

### Authenticated Endpoints

- `GET /api/auth/user` - Get current user
- `GET /api/user/progress` - Get learning progress
- `POST /api/quiz/:quizId/answer` - Submit quiz answer
- `POST /api/support` - Create support request

### Admin Endpoints

- `GET /api/admin/users` - List all users
- `GET /api/admin/topics` - List all topics
- `GET /api/admin/support` - View support requests
- `GET /api/admin/stats` - Platform analytics

For complete API documentation, see the code in `server/routes.ts`.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Quality Standards

- TypeScript strict mode enabled
- ESLint configuration followed
- 70%+ test coverage for new features
- All tests passing before merge

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **In-App Support**: Use the support form at `/support`

## 🔗 Links

- [Design Guidelines](design_guidelines.md)
- [Environment Variables](ENVIRONMENT_VARIABLES.md)
- [Railway Deployment](RAILWAY.md)
- [Replit Setup](replit.md)

---

Built with ❤️ using Claude Sonnet 4.5
