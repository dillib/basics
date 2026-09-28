# Environment Variables for BasicsTutor (Railway)

These variables must be set in your Railway project settings.

## Database
# Railway will provide this automatically if you add a PostgreSQL plugin.
# DATABASE_URL=postgresql://postgres:password@host:port/dbname

## Authentication (Google OAuth)
# Create credentials at: https://console.cloud.google.com/apis/credentials
# Authorized Redirect URI: https://<your-railway-app-url>/api/auth/google/callback
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
SESSION_SECRET=complex_random_string_for_session_encryption

## Admin Access
# Comma-separated list of admin email addresses (no spaces unless email requires it)
ADMIN_EMAILS=admin@example.com,admin2@example.com

## Payments (Stripe)
# Keys from: https://dashboard.stripe.com/apikeys
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
# Webhook Secret from: https://dashboard.stripe.com/webhooks
# Endpoint to add: https://<your-railway-app-url>/api/stripe/webhook
# Events to listen for: checkout.session.completed
STRIPE_WEBHOOK_SECRET=whsec_...

## AI Integration (Gemini)
# Key from: https://aistudio.google.com/app/apikey
AI_INTEGRATIONS_GEMINI_API_KEY=your_gemini_api_key
AI_INTEGRATIONS_GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/

## Web research before writing (Perplexity) -- optional
# Key from: https://console.perplexity.ai  (see server/research.ts)
PERPLEXITY_API_KEY=your_perplexity_api_key

## Decision layer (TypeSafe Jev) -- optional
# Key from the TypeSafe dashboard (https://typesafe.ai). Powers search intake:
# meaning-based matching, follow-up questions, duplicate guard. Unset = the
# search box works exactly as before. See JEV.md.
TYPESAFE_API_KEY=your_typesafe_api_key
# JEV_DISABLED=true   # kill switch without removing the key

## Fast model for short JSON jobs (Inception Mercury) -- optional
# Key from: https://platform.inceptionlabs.ai  (see server/llm.ts). Writes the
# search follow-up options and the instant preview; Gemini is the fallback.
INCEPTION_API_KEY=your_inception_api_key
# INCEPTION_MODEL=mercury-2.5
# MERCURY_DISABLED=true   # kill switch without removing the key

## AI spend (server/ai-spend.ts)
# Readers never notice the budget: at 80%/100% you get an email (REPORT_EMAIL,
# else the first ADMIN_EMAILS; needs RESEND_API_KEY) and background jobs pause.
# Past the hard limit, new concept animations use Gemini instead of Claude.
# AI_DAILY_BUDGET_USD=5
# AI_HARD_LIMIT_USD=20   # default 4x the daily budget

## Node Environment
NODE_ENV=production
PORT=5000
