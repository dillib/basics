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

## Node Environment
NODE_ENV=production
PORT=5000
