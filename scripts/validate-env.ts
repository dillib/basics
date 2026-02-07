#!/usr/bin/env tsx
/**
 * Environment Validation Script
 * Checks if all required environment variables are set before deployment
 */

interface EnvVar {
  name: string;
  required: boolean;
  description: string;
  example?: string;
}

const ENV_VARS: EnvVar[] = [
  // Essential
  {
    name: 'DATABASE_URL',
    required: true,
    description: 'PostgreSQL connection string',
    example: 'postgresql://user:pass@host:5432/db',
  },
  {
    name: 'SESSION_SECRET',
    required: true,
    description: 'Random secret for session encryption',
    example: 'Run: openssl rand -base64 32',
  },
  {
    name: 'GEMINI_API_KEY',
    required: true,
    description: 'Google Gemini API key for content generation',
    example: 'Get from: https://makersuite.google.com/app/apikey',
  },

  // Google OAuth (required for login)
  {
    name: 'GOOGLE_CLIENT_ID',
    required: true,
    description: 'Google OAuth Client ID',
    example: 'xxx.apps.googleusercontent.com',
  },
  {
    name: 'GOOGLE_CLIENT_SECRET',
    required: true,
    description: 'Google OAuth Client Secret',
    example: 'GOCSPX-xxxx',
  },

  // Stripe (required for payments)
  {
    name: 'STRIPE_SECRET_KEY',
    required: false,
    description: 'Stripe secret key (required for payments)',
    example: 'sk_test_xxxx or sk_live_xxxx',
  },
  {
    name: 'STRIPE_PUBLISHABLE_KEY',
    required: false,
    description: 'Stripe publishable key',
    example: 'pk_test_xxxx or pk_live_xxxx',
  },
  {
    name: 'STRIPE_WEBHOOK_SECRET',
    required: false,
    description: 'Stripe webhook secret',
    example: 'whsec_xxxx',
  },

  // Optional
  {
    name: 'ADMIN_EMAILS',
    required: false,
    description: 'Comma-separated admin email addresses',
    example: 'admin@example.com,admin2@example.com',
  },
  {
    name: 'NODE_ENV',
    required: false,
    description: 'Node environment (usually auto-set)',
    example: 'production',
  },
];

function validateEnvironment(): void {
  console.log('🔍 Validating Environment Configuration...\n');

  let hasErrors = false;
  let hasWarnings = false;

  for (const envVar of ENV_VARS) {
    const value = process.env[envVar.name];
    const isSet = !!value;

    if (envVar.required && !isSet) {
      console.log(`❌ ${envVar.name}`);
      console.log(`   ${envVar.description}`);
      if (envVar.example) {
        console.log(`   Example: ${envVar.example}`);
      }
      console.log('');
      hasErrors = true;
    } else if (!envVar.required && !isSet) {
      console.log(`⚠️  ${envVar.name} (optional)`);
      console.log(`   ${envVar.description}`);
      console.log('');
      hasWarnings = true;
    } else {
      // Show masked value
      const maskedValue = value!.length > 20
        ? `${value!.substring(0, 8)}...${value!.substring(value!.length - 4)}`
        : value!.substring(0, 10) + '...';
      console.log(`✅ ${envVar.name}`);
      console.log(`   ${maskedValue}`);
      console.log('');
    }
  }

  console.log('═══════════════════════════════════════\n');

  if (hasErrors) {
    console.log('❌ Missing required environment variables!');
    console.log('Please set the missing variables before deployment.\n');
    console.log('For local development: Create a .env file');
    console.log('For Render: Add in Dashboard → Environment\n');
    process.exit(1);
  }

  if (hasWarnings) {
    console.log('⚠️  Some optional variables are not set');
    console.log('The app will work but some features may be limited.\n');
  }

  console.log('✅ All required environment variables are set!');
  console.log('Ready for deployment.\n');
}

// Run validation
try {
  validateEnvironment();
} catch (error) {
  console.error('Error during validation:', error);
  process.exit(1);
}
