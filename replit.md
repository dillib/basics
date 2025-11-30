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

**Payment Processing** (Prepared but not fully implemented)
- Stripe integration references in dependencies for premium subscriptions
- Free tier: One topic per unauthenticated user (tracked via session)
- Pro tier: Unlimited topics with payment gateway integration

**Session Management**
- PostgreSQL session store via connect-pg-simple
- HTTP-only secure cookies for session tokens
- 7-day session TTL with automatic cleanup