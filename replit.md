# BasicsTutor.com - AI-Powered First Principles Learning Platform

## Overview

BasicsTutor.com is an AI-driven educational platform designed to teach complex topics by breaking them down into fundamental first principles. It dynamically generates learning content, including principle explanations, visual diagrams, interactive quizzes, and personalized learning paths, for any user-entered topic. The platform's core purpose is to build deep understanding through a progressive layering of concepts and real-world analogies, aiming to make advanced learning accessible and intuitive.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript, Vite for bundling.
- **Routing**: Wouter for client-side routing.
- **UI/UX**: Mobile-first responsive design, Shadcn/ui (Radix UI primitives) with "new-york" style, Tailwind CSS, custom light/dark theme, typography using SF Pro Display/Text.
- **State Management**: TanStack Query for server state and caching, React hooks for local state, custom `useAuth` hook.
- **Animations**: Framer Motion for smooth transitions.

### Backend
- **Framework**: Express.js on Node.js with TypeScript.
- **API Design**: RESTful endpoints, standardized error handling, CORS, session-based authentication.
- **Authentication**: OpenID Connect (OIDC) via Replit's service, Passport.js, PostgreSQL for session storage.
- **Content Generation**: AI-powered content (topics, principles, quizzes) using Google Gemini 2.5 Flash model with structured prompt engineering and JSON schema-based responses.

### Data Storage
- **Database**: PostgreSQL (Neon serverless) with Drizzle ORM for type-safe operations.
- **Schema**:
    - `users`: User profiles, authentication data.
    - `topics`: Learning content metadata.
    - `principles`: Fundamental concepts within topics.
    - `quizzes`, `questions`: Assessment containers and individual questions.
    - `progress`: User learning tracking.
    - `sessions`: Express session storage.
    - `topic_purchases`: Records individual topic purchases.
    - Pro-exclusive data: `quiz_attempts`, `principle_mastery`, `review_schedule`, `tutor_sessions`, `tutor_messages`.
- **Relations**: Enforced relational integrity with foreign keys (e.g., users to topics, topics to principles).

### System Design
- **Freemium Model**: Sample topics are fully free. User-generated topics offer first 2 principles free, with pay-per-topic or Pro subscription to unlock more.
- **Pricing Tiers**: Pay-per-topic ($1.99), Pro annual ($99/year) including AI Tutor Chat, Quiz Analytics, Spaced Repetition Review.
- **Admin Dashboard**: Comprehensive admin interface with user, topic, revenue, and support management.
- **Support System**: User-facing support page for submitting requests (support, bug, feature, feedback) with type/priority selection. Admin Support tab with ticket listing, status filtering, assignment, and threaded messaging.
- **Support Infrastructure**: Dedicated Contact, Help Center, Terms of Service, Privacy Policy, and Account Settings pages.

## External Dependencies

- **AI/ML Services**: Google Generative AI (Gemini API) for content creation.
- **Authentication**: Replit OpenID Connect service.
- **Database Hosting**: Neon Serverless PostgreSQL.
- **Payment Processing**: Stripe with `stripe-replit-sync`.
- **UI Libraries**: Radix UI, Lucide React, React Icons, Framer Motion.
- **Development Tools**: Replit-specific Vite plugins (`vite-plugin-runtime-error-modal`, `vite-plugin-cartographer`, `vite-plugin-dev-banner`).