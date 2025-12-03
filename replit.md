# BasicsTutor.com - AI-Powered First Principles Learning Platform

## Overview

BasicsTutor.com is an AI-driven educational platform that teaches complex topics by breaking them down into fundamental first principles. The application enables users to enter any topic and receive dynamically generated learning content including principle explanations, visual diagrams, interactive quizzes, and personalized learning paths. The platform emphasizes building understanding from the ground up using real-world analogies and progressive concept layering.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server for fast HMR (Hot Module Replacement)
- Wouter for lightweight client-side routing instead of React Router
- Mobile-first responsive design approach

**UI Component System**
- Shadcn/ui component library (Radix UI primitives) configured in "new-york" style
- Tailwind CSS for utility-first styling with custom design tokens
- Design system inspired by Apple's generous spacing and Google Material Design 3's adaptive color systems
- Custom theme system supporting light/dark modes with CSS variables
- Typography hierarchy using SF Pro Display/Text fonts (fallback to Inter)

**State Management**
- TanStack Query (React Query) for server state management, caching, and data fetching
- Local component state with React hooks for UI-specific state
- Custom authentication hook (useAuth) for user session management
- Optimistic updates and background refetching disabled by default (staleTime: Infinity)

**Key Design Decisions**
- Component-based architecture with reusable UI primitives
- Path aliases (@/, @shared/, @assets/) for clean imports
- Framer Motion for smooth animations and transitions
- Separation of example components for development/testing

### Backend Architecture

**Server Framework**
- Express.js on Node.js for RESTful API endpoints
- TypeScript for type safety across the stack
- HTTP server with custom logging middleware tracking request duration and responses
- Session-based authentication using express-session

**API Design Pattern**
- RESTful endpoints organized by resource (topics, principles, quizzes, progress)
- Standardized error handling with HTTP status codes
- Request body parsing with JSON verification
- CORS configuration for cross-origin requests
- Credential-based requests for authentication

**Authentication System**
- OpenID Connect (OIDC) integration with Replit's authentication service
- Passport.js strategy for OAuth flow
- Session storage in PostgreSQL with connect-pg-simple
- Token refresh mechanism with access_token and refresh_token
- Protected routes using isAuthenticated middleware

**Content Generation Pipeline**
- AI-powered content creation using Google Gemini 2.5 Flash model
- Structured prompt engineering for generating topic breakdowns with first principles
- JSON schema-based responses for consistent data structure
- Separate functions for topic content and quiz question generation
- Memoization for OIDC configuration to reduce redundant API calls

### Data Storage

**Database**
- PostgreSQL as the primary relational database
- Neon serverless database with WebSocket support for connection pooling
- Drizzle ORM for type-safe database operations and schema management
- Schema-first approach with TypeScript types derived from database schema

**Database Schema Design**
- **users**: Authentication and user profile data (id, email, name, plan, topicsUsed)
- **topics**: Learning content metadata (title, slug, description, category, difficulty, estimatedMinutes)
- **principles**: Fundamental concepts within topics (title, explanation, analogy, visualData, keyTakeaways)
- **quizzes**: Assessment containers linked to topics
- **questions**: Individual quiz questions with multiple choice options and explanations
- **progress**: User learning tracking (completedPrinciples, quizScore, completedAt)
- **sessions**: Express session storage for authentication

**Data Relations**
- One-to-many: users → topics, topics → principles, topics → quizzes, quizzes → questions
- Many-to-one: progress references both users and topics
- Relational integrity enforced through foreign key references

### External Dependencies

**AI/ML Services**
- Google Generative AI (Gemini API) for content generation
  - Custom base URL configuration support for flexible deployment
  - API key authentication via environment variables
  - Structured output generation with type safety

**Authentication Provider**
- Replit OpenID Connect service for user authentication
  - OAuth 2.0 flow with authorization code grant
  - JWT-based token management
  - User profile claims (sub, email, name, profile image)

**Database Hosting**
- Neon Serverless PostgreSQL
  - WebSocket-based connections for reduced latency
  - Connection pooling for efficient resource usage
  - DATABASE_URL environment variable for connection string

**UI Component Libraries**
- Radix UI primitives for accessible, unstyled component primitives
- Lucide React for consistent iconography
- React Icons for social media icons
- Framer Motion for declarative animations

**Development Tools**
- Replit-specific plugins for development workflow
  - vite-plugin-runtime-error-modal for enhanced error display
  - vite-plugin-cartographer for code navigation
  - vite-plugin-dev-banner for development environment indicators

**Build & Deployment**
- esbuild for server-side bundling with selective dependency bundling
- PostCSS with Autoprefixer for CSS processing
- Custom build script that compiles both client (Vite) and server (esbuild) separately

**Payment Processing** (Fully Implemented)
- Stripe integration with stripe-replit-sync for automatic webhook management
- Freemium pricing model:
  - Sample topics: Fully free (all principles and quizzes available)
  - User-generated topics: First 2 principles free preview, rest locked
  - Pay-per-topic: $1.99 per topic (unlocks all principles and quiz)
  - Pro subscription: $9.99/month for unlimited topics
- Checkout flow with success/cancel pages
- Topic access control based on sample status, plan, and purchase status
- Stripe customer and subscription management

**Sample Topics System**
- Sample topics marked with `isSample: true` flag in database
- Sample topics are fully accessible (all principles + quizzes) for everyone
- Sample topics displayed prominently on home page FeaturedTopics section
- Non-sample topics have first 2 principles as free preview

**Session Management**
- PostgreSQL session store via connect-pg-simple
- HTTP-only secure cookies for session tokens
- 7-day session TTL with automatic cleanup

## Recent Changes

**December 3, 2025**
- Implemented complete freemium model with sample topics system:
  - Added `isSample` boolean column to topics table
  - Sample topics are fully free (all principles + quizzes accessible by everyone)
  - User-generated topics have first 2 principles as free preview
  - Principles 3+ locked with unlock options ($1.99 per topic or Pro subscription)
  - Quizzes locked for non-sample topics until purchased
- Updated TopicLearningPage with proper access control:
  - Inline lock icons on locked principles
  - Clear unlock prompts with sign-in flow for unauthenticated users
  - Separate paths for authenticated (purchase options) vs unauthenticated (sign-in first)
- Added redirect-after-login mechanism:
  - Stores redirect URL in sessionStorage before login
  - Automatically redirects users back to topic after authentication
- Updated FeaturedTopics component to fetch real sample topics from API
- Added 3 sample topics: Basic Chemistry, Introduction to Biology, Basic Economics

**December 2, 2025**
- Added complete support infrastructure with 5 new pages:
  - Contact page (/contact) - Support form with validation using shadcn Form components
  - Help Center (/help) - FAQ page with 4 categories, search, and accordion questions
  - Terms of Service (/terms) - Complete terms with 11 sections
  - Privacy Policy (/privacy) - GDPR-compliant privacy policy with 12 sections
  - Account Settings (/account) - User profile, subscription info, security settings
- Updated Footer component:
  - Removed broken links pointing to non-existent pages
  - Reorganized into Product, Support, and Legal sections
  - Added support email (support@basicstutor.com)
  - All footer links now point to existing pages
- Updated App.tsx with 5 new routes
- All pages follow design guidelines with proper data-testid attributes

**December 1, 2025**
- Implemented full Stripe payment integration with stripe-replit-sync
- Added pay-per-topic ($1.99) and Pro subscription ($9.99/month) tiers
- Created topic_purchases table for tracking individual topic purchases
- Implemented topic access control based on plan and purchase status
- Added checkout success/cancel pages with payment verification
- Added paywall UI to TopicLearningPage with proper authentication guards
- Fixed authentication checks for purchase flow to redirect unauthenticated users to login

**November 30, 2025**
- Fixed critical routing bug: TopicPage.tsx now correctly uses `params.slug` (was `params.id`)
- Added progress tracking: users can mark principles as complete
- Progress persists to database via POST /api/progress/:topicId
- Dashboard now fetches topics from both created topics AND topics with progress
- Added unique constraint on progress table (userId, topicId) for proper upsert
- Fixed TanStack Query caching with 5-minute staleTime and retry enabled

## API Routes

**Topics**
- GET `/api/topics` - Fetch all public topics
- GET `/api/sample-topics` - Fetch sample topics (fully free)
- GET `/api/topics/:slug` - Fetch topic by slug (includes isSample flag)
- GET `/api/topics/:topicId/principles` - Fetch principles for topic
- GET `/api/topics/:topicId/is-sample` - Check if topic is a sample
- POST `/api/topics/generate` - Generate new topic via AI (no auth required)

**Progress**
- GET `/api/user/progress` - Get all progress records for authenticated user
- GET `/api/user/topics` - Get topics user created OR has progress on
- POST `/api/progress/:topicId` - Save/update progress for topic

**Quizzes**
- GET `/api/topics/:topicId/quizzes` - Get quizzes for topic
- POST `/api/topics/:topicId/quiz/generate` - Generate quiz via AI

**Payments**
- GET `/api/stripe/publishable-key` - Get Stripe publishable key
- GET `/api/stripe/products` - Get available products and prices
- POST `/api/checkout/topic/:topicId` - Create checkout session for topic purchase
- POST `/api/checkout/pro` - Create checkout session for Pro subscription
- GET `/api/checkout/verify/:sessionId` - Verify payment and update user access
- GET `/api/user/purchases` - Get user's topic purchases
- GET `/api/user/can-access-topic/:topicId` - Check if user can access a topic

## Known Limitations

1. **Sequential Progress**: Progress tracking stores count of completed principles (not specific IDs). This assumes sequential learning where principles build on each other.