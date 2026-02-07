/**
 * Centralized application configuration
 * All configuration values should be defined here for easy management
 */

export const config = {
  // Server Configuration
  server: {
    port: parseInt(process.env.PORT || '5000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV === 'development',
    isTest: process.env.NODE_ENV === 'test',
  },

  // Pricing Configuration (in cents)
  // Freemium Tiers:
  // - Anonymous: 1 free topic
  // - Free Account (sign up): 3 free topics + saved progress
  // - Pro ($9/mo): Unlimited topics + AI Tutor + Analytics
  pricing: {
    topicPurchase: parseInt(process.env.TOPIC_PRICE_CENTS || '199', 10), // $1.99 per topic (legacy)
    proMonthly: parseInt(process.env.PRO_MONTHLY_PRICE_CENTS || '900', 10), // $9.00/month
    proAnnual: parseInt(process.env.PRO_ANNUAL_PRICE_CENTS || '9900', 10), // $99.00/year (legacy)
  },

  // Quiz Configuration
  quiz: {
    passingScore: parseInt(process.env.QUIZ_PASSING_SCORE || '70', 10),
    questionsPerQuiz: parseInt(process.env.QUESTIONS_PER_QUIZ || '5', 10),
  },

  // User Limits - Freemium Model
  limits: {
    // Anonymous users: 1 free topic
    anonymousTopicsLimit: parseInt(process.env.ANONYMOUS_TOPICS_LIMIT || '1', 10),
    // Free account: 3 free topics
    freeTopicsLimit: parseInt(process.env.FREE_TOPICS_LIMIT || '3', 10),
    // Pro account: unlimited (enforced by plan check, not limit)
    maxSupportRequestLength: 5000,
    maxTopicTitleLength: 200,
    maxTopicDescriptionLength: 1000,
    maxMessageLength: 5000,
  },

  // Session Configuration
  session: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week in milliseconds
    secret: process.env.SESSION_SECRET!,
  },

  // Database Configuration
  database: {
    url: process.env.DATABASE_URL!,
  },

  // Redis Configuration (optional)
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  // OAuth Configuration
  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: '/api/auth/google/callback',
    },
  },

  // Stripe Configuration
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY!,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY!,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  },

  // AI Configuration
  ai: {
    gemini: {
      apiKey: process.env.GOOGLE_API_KEY || process.env.AI_INTEGRATIONS_GEMINI_API_KEY || '',
      baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
    },
  },

  // Admin Configuration
  admin: {
    emails: (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map(email => email.trim())
      .filter(Boolean),
  },
} as const;

/**
 * Validates required configuration on startup
 * Throws an error if any required config is missing
 */
export function validateConfig(): void {
  const errors: string[] = [];

  // Validate pricing
  if (config.pricing.topicPurchase < 0) {
    errors.push('TOPIC_PRICE_CENTS must be a positive number');
  }
  if (config.pricing.proAnnual < 0) {
    errors.push('PRO_ANNUAL_PRICE_CENTS must be a positive number');
  }

  // Validate quiz settings
  if (config.quiz.passingScore < 0 || config.quiz.passingScore > 100) {
    errors.push('QUIZ_PASSING_SCORE must be between 0 and 100');
  }
  if (config.quiz.questionsPerQuiz < 1) {
    errors.push('QUESTIONS_PER_QUIZ must be at least 1');
  }

  // Validate limits
  if (config.limits.freeTopicsLimit < 0) {
    errors.push('FREE_TOPICS_LIMIT must be a positive number');
  }

  // Validate session
  if (!config.session.secret) {
    errors.push('SESSION_SECRET is required');
  }

  // Validate database
  if (!config.database.url) {
    errors.push('DATABASE_URL is required');
  }

  // Validate OAuth
  if (!config.oauth.google.clientId) {
    errors.push('GOOGLE_CLIENT_ID is required');
  }
  if (!config.oauth.google.clientSecret) {
    errors.push('GOOGLE_CLIENT_SECRET is required');
  }

  // Validate AI
  if (!config.ai.gemini.apiKey) {
    console.warn('⚠️  Warning: Gemini API key not configured. AI features will not work.');
  }

  if (errors.length > 0) {
    throw new Error(
      `Configuration validation failed:\n${errors.map(e => `  - ${e}`).join('\n')}`
    );
  }
}

/**
 * Prints configuration summary (safe values only)
 */
export function printConfigSummary(): void {
  console.log('📋 Configuration Summary:');
  console.log(`   Environment: ${config.server.nodeEnv}`);
  console.log(`   Port: ${config.server.port}`);
  console.log(`   Topic Price: $${(config.pricing.topicPurchase / 100).toFixed(2)}`);
  console.log(`   Pro Annual: $${(config.pricing.proAnnual / 100).toFixed(2)}`);
  console.log(`   Quiz Passing Score: ${config.quiz.passingScore}%`);
  console.log(`   Free Topics Limit: ${config.limits.freeTopicsLimit}`);
  console.log(`   Admin Emails: ${config.admin.emails.length > 0 ? config.admin.emails.join(', ') : 'None configured'}`);
  console.log(`   AI Configured: ${config.ai.gemini.apiKey ? 'Yes' : 'No'}`);
}
